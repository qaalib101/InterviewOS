import { applicationInputSchema, applicationUpdateSchema } from "@interview-os/shared";
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler, getLocalUserId, validateBody } from "../shared/http.js";
import { recordActivity } from "./activity.js";

export const applicationsRouter = Router();

const applicationInclude = {
  company: true,
  contacts: true
};

applicationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getLocalUserId(prisma);
    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: applicationInclude
    });

    res.json(applications);
  })
);

applicationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const application = await prisma.application.findFirst({
      where: { id, userId },
      include: applicationInclude
    });

    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json(application);
  })
);

applicationsRouter.post(
  "/",
  validateBody(applicationInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const company = await prisma.company.findFirst({ where: { id: req.body.companyId, userId } });
    if (!company) return res.status(400).json({ error: "Company does not exist" });

    const application = await prisma.application.create({
      data: { ...req.body, userId },
      include: applicationInclude
    });

    await recordActivity(prisma, {
      userId,
      entityType: "APPLICATION",
      entityId: application.id,
      eventType: "CREATED",
      metadata: { roleTitle: application.roleTitle, companyName: application.company?.name ?? company.name, stage: application.stage }
    });

    res.status(201).json(application);
  })
);

applicationsRouter.patch(
  "/:id",
  validateBody(applicationUpdateSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.application.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Application not found" });

    if (req.body.companyId) {
      const company = await prisma.company.findFirst({ where: { id: req.body.companyId, userId } });
      if (!company) return res.status(400).json({ error: "Company does not exist" });
    }

    const application = await prisma.application.update({
      where: { id },
      data: req.body,
      include: applicationInclude
    });

    await recordActivity(prisma, {
      userId,
      entityType: "APPLICATION",
      entityId: application.id,
      eventType: req.body.stage && req.body.stage !== existing.stage ? "STAGE_CHANGED" : "UPDATED",
      metadata: {
        roleTitle: application.roleTitle,
        companyName: application.company?.name ?? null,
        previousStage: existing.stage,
        stage: application.stage
      }
    });

    res.json(application);
  })
);

applicationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.application.findFirst({ where: { id, userId }, include: { company: true } });
    if (!existing) return res.status(404).json({ error: "Application not found" });

    await recordActivity(prisma, {
      userId,
      entityType: "APPLICATION",
      entityId: existing.id,
      eventType: "DELETED",
      metadata: { roleTitle: existing.roleTitle, companyName: existing.company?.name ?? null, stage: existing.stage }
    });
    await prisma.application.delete({ where: { id } });
    res.status(204).send();
  })
);
