import { analyzeImportInputSchema, commitImportInputSchema, importAnalysisResultSchema, updateImportProposalsInputSchema } from "@interview-os/shared";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler, getLocalUserId, validateBody } from "../shared/http.js";
import { logError, logInfo, logWarn } from "../shared/logger.js";
import { getAiProvider } from "./ai/providerFactory.js";
import { commitImportSession } from "./imports.commit.js";
import { applyLocalMatches } from "./imports.matching.js";
import { normalizeImportAnalysis } from "./imports.normalize.js";

export const importsRouter = Router();

importsRouter.post(
  "/analyze",
  validateBody(analyzeImportInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const provider = getAiProvider();
    const status = provider.status();

    if (!status.available) {
      logWarn("import_analysis_provider_unavailable", { provider: status.provider, sourceType: req.body.sourceType });
      return res.status(503).json(status);
    }

    const session = await prisma.importSession.create({
      data: {
        userId,
        sourceType: toDbSourceType(req.body.sourceType),
        rawText: req.body.rawText,
        provider: provider.name,
        status: "DRAFT"
      }
    });

    logInfo("import_analysis_started", { sessionId: session.id, provider: provider.name, sourceType: req.body.sourceType, rawTextLength: req.body.rawText.length });

    try {
      const providerAnalysis = normalizeImportAnalysis(await provider.analyzeImport(req.body));
      const analysis = await applyLocalMatches(prisma, userId, providerAnalysis);
      const updated = await prisma.importSession.update({
        where: { id: session.id },
        data: { status: "ANALYZED", analysisJson: analysis as unknown as Prisma.InputJsonValue, errorMessage: null }
      });

      logInfo("import_analysis_completed", {
        sessionId: session.id,
        provider: provider.name,
        proposalCount: analysis.proposals.length,
        includedCount: analysis.proposals.filter((proposal) => proposal.included).length
      });
      res.status(201).json({ ...updated, analysis });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import analysis failed.";
      const failed = await prisma.importSession.update({
        where: { id: session.id },
        data: { status: "FAILED", errorMessage: message }
      });
      logError("import_analysis_failed", { sessionId: session.id, provider: provider.name, message });
      res.status(422).json({ ...failed, error: message });
    }
  })
);

importsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const session = await prisma.importSession.findFirst({ where: { id: String(req.params.id), userId } });
    if (!session) return res.status(404).json({ error: "Import session not found" });
    res.json({ ...session, analysis: session.analysisJson });
  })
);

importsRouter.patch(
  "/:id/proposals",
  validateBody(updateImportProposalsInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.importSession.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Import session not found" });
    if (existing.status === "COMMITTED") return res.status(409).json({ error: "Committed imports cannot be edited" });

    const session = await prisma.importSession.update({
      where: { id },
      data: { analysisJson: req.body.analysis as unknown as Prisma.InputJsonValue, status: "ANALYZED", errorMessage: null }
    });

    logInfo("import_proposals_updated", { sessionId: id, proposalCount: req.body.analysis.proposals.length });
    res.json({ ...session, analysis: req.body.analysis });
  })
);

importsRouter.post(
  "/:id/commit",
  validateBody(commitImportInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const session = await prisma.importSession.findFirst({ where: { id, userId } });
    if (!session) return res.status(404).json({ error: "Import session not found" });
    if (session.status === "COMMITTED") return res.status(409).json({ error: "Import session already committed" });

    const analysis = normalizeImportAnalysis(req.body.analysis ?? session.analysisJson);
    logInfo("import_commit_started", { sessionId: id, includedCount: analysis.proposals.filter((proposal) => proposal.included && proposal.operation !== "SKIP").length });
    const result = await commitImportSession(prisma, userId, id, analysis);
    logInfo("import_commit_completed", { sessionId: id, recordCount: result.records.length });
    res.json(result);
  })
);

function toDbSourceType(sourceType: string) {
  return sourceType.toUpperCase() as any;
}
