import type { ImportAnalysisResult, ImportProposal } from "@interview-os/shared";
import type { Prisma, PrismaClient } from "@prisma/client";
import { logInfo, logWarn } from "../shared/logger.js";
import { recordActivity } from "./activity.js";

type Tx = Prisma.TransactionClient;

type CommitResult = {
  records: Array<{ proposalId: string; entityType: string; operation: string; id: string; label: string; path: string }>;
};

export async function commitImportSession(db: PrismaClient, userId: string, sessionId: string, analysis: ImportAnalysisResult): Promise<CommitResult> {
  return db.$transaction(async (tx) => {
    const created = new Map<string, string>();
    const records: CommitResult["records"] = [];
    const included = analysis.proposals.filter((proposal) => proposal.included && proposal.operation !== "SKIP");
    validateIncluded(included);

    for (const entityType of ["COMPANY", "APPLICATION", "CONTACT", "INTERVIEW", "INTERVIEW_NOTE", "FOLLOW_UP"] as const) {
      for (const proposal of included.filter((item) => item.entityType === entityType)) {
        const record = await commitProposal(tx, userId, proposal, created);
        logInfo("import_proposal_committed", { sessionId, proposalId: proposal.id, entityType: proposal.entityType, operation: proposal.operation, recordId: record.id });
        created.set(proposal.id, record.id);
        records.push(record);
      }
    }

    await tx.importSession.update({
      where: { id: sessionId },
      data: { status: "COMMITTED", analysisJson: analysis as unknown as Prisma.InputJsonValue, committedAt: new Date(), errorMessage: null }
    });

    return { records };
  });
}

export class ImportCommitError extends Error {
  constructor(message: string, public statusCode = 400, public context: Record<string, unknown> = {}) {
    super(message);
    this.name = "ImportCommitError";
  }
}

async function commitProposal(tx: Tx, userId: string, proposal: ImportProposal, created: Map<string, string>) {
  if (proposal.entityType === "COMPANY") {
    const data = stripNulls({ name: stringForOperation(proposal, "name"), website: field(proposal, "website"), industry: field(proposal, "industry"), location: field(proposal, "location"), notes: field(proposal, "notes") });
    const record = proposal.operation === "UPDATE" ? await tx.company.update({ where: { id: requiredExisting(proposal) }, data }) : await tx.company.create({ data: { ...data, userId } as any });
    await recordActivity(tx as any, { userId, entityType: "COMPANY", entityId: record.id, eventType: proposal.operation === "UPDATE" ? "UPDATED" : "CREATED", metadata: { name: record.name } });
    return result(proposal, record.id, record.name, "/companies");
  }

  if (proposal.entityType === "APPLICATION") {
    const companyId = resolveId(proposal, created, "companyId", "companyProposalId", proposal.operation === "CREATE");
    const data = stripNulls({ companyId, roleTitle: stringForOperation(proposal, "roleTitle"), jobUrl: field(proposal, "jobUrl"), source: field(proposal, "source"), stage: field(proposal, "stage") ?? (proposal.operation === "CREATE" ? "SAVED" : null), compensationMin: numberField(proposal, "compensationMin"), compensationMax: numberField(proposal, "compensationMax"), remoteMode: field(proposal, "remoteMode") ?? (proposal.operation === "CREATE" ? "UNKNOWN" : null), priority: field(proposal, "priority") ?? (proposal.operation === "CREATE" ? "MEDIUM" : null), concerns: field(proposal, "concerns"), nextAction: field(proposal, "nextAction"), nextActionAt: dateField(proposal, "nextActionAt"), notes: field(proposal, "notes") });
    const record = proposal.operation === "UPDATE" ? await tx.application.update({ where: { id: requiredExisting(proposal) }, data }) : await tx.application.create({ data: { ...data, userId } as any });
    await recordActivity(tx as any, { userId, entityType: "APPLICATION", entityId: record.id, eventType: proposal.operation === "UPDATE" ? "UPDATED" : "CREATED", metadata: { roleTitle: record.roleTitle } });
    return result(proposal, record.id, record.roleTitle, "/applications");
  }

  if (proposal.entityType === "CONTACT") {
    const data = stripNulls({ companyId: resolveId(proposal, created, "companyId", "companyProposalId", false), applicationId: resolveId(proposal, created, "applicationId", "applicationProposalId", false), name: stringForOperation(proposal, "name"), role: field(proposal, "role"), email: field(proposal, "email"), phone: field(proposal, "phone"), linkedinUrl: field(proposal, "linkedinUrl"), notes: field(proposal, "notes") });
    const record = proposal.operation === "UPDATE" ? await tx.contact.update({ where: { id: requiredExisting(proposal) }, data }) : await tx.contact.create({ data: { ...data, userId } as any });
    await recordActivity(tx as any, { userId, entityType: "CONTACT", entityId: record.id, eventType: proposal.operation === "UPDATE" ? "UPDATED" : "CREATED", metadata: { name: record.name } });
    return result(proposal, record.id, record.name, "/contacts");
  }

  if (proposal.entityType === "INTERVIEW") {
    const data = stripNulls({ applicationId: resolveId(proposal, created, "applicationId", "applicationProposalId", proposal.operation === "CREATE"), roundName: stringForOperation(proposal, "roundName"), roundNumber: numberForOperation(proposal, "roundNumber", 1), type: field(proposal, "type") ?? (proposal.operation === "CREATE" ? "OTHER" : null), format: field(proposal, "format") ?? (proposal.operation === "CREATE" ? "OTHER" : null), scheduledAt: dateForOperation(proposal, "scheduledAt"), durationMinutes: numberForOperation(proposal, "durationMinutes", 60), interviewers: textField(proposal, "interviewers"), expectedTopics: textField(proposal, "expectedTopics"), prepNotes: field(proposal, "prepNotes"), rawPostInterviewNotes: field(proposal, "rawPostInterviewNotes"), outcome: field(proposal, "outcome") ?? (proposal.operation === "CREATE" ? "SCHEDULED" : null) });
    const record = proposal.operation === "UPDATE" ? await tx.interview.update({ where: { id: requiredExisting(proposal) }, data }) : await tx.interview.create({ data: { ...data, userId } as any });
    await recordActivity(tx as any, { userId, entityType: "INTERVIEW", entityId: record.id, eventType: proposal.operation === "UPDATE" ? "UPDATED" : "CREATED", metadata: { roundName: record.roundName } });
    return result(proposal, record.id, record.roundName, "/interviews");
  }

  if (proposal.entityType === "INTERVIEW_NOTE") {
    const data = stripNulls({ interviewId: resolveId(proposal, created, "interviewId", "interviewProposalId", proposal.operation === "CREATE"), type: field(proposal, "type") ?? (proposal.operation === "CREATE" ? "RAW_POST_INTERVIEW" : null), body: stringForOperation(proposal, "body") });
    const record = proposal.operation === "UPDATE" ? await tx.interviewNote.update({ where: { id: requiredExisting(proposal) }, data }) : await tx.interviewNote.create({ data: { ...data, userId } as any });
    await recordActivity(tx as any, { userId, entityType: "INTERVIEW_NOTE", entityId: record.id, eventType: proposal.operation === "UPDATE" ? "UPDATED" : "CREATED", metadata: { noteType: record.type } });
    return result(proposal, record.id, String(record.type), "/interviews");
  }

  const data = stripNulls({ applicationId: resolveId(proposal, created, "applicationId", "applicationProposalId", false), contactId: resolveId(proposal, created, "contactId", "contactProposalId", false), interviewId: resolveId(proposal, created, "interviewId", "interviewProposalId", false), title: stringForOperation(proposal, "title"), dueAt: dateForOperation(proposal, "dueAt"), priority: field(proposal, "priority") ?? (proposal.operation === "CREATE" ? "MEDIUM" : null), type: field(proposal, "type") ?? (proposal.operation === "CREATE" ? "OTHER" : null), notes: field(proposal, "notes") });
  const record = proposal.operation === "UPDATE" ? await tx.followUp.update({ where: { id: requiredExisting(proposal) }, data }) : await tx.followUp.create({ data: { ...data, userId } as any });
  await recordActivity(tx as any, { userId, entityType: "FOLLOW_UP", entityId: record.id, eventType: proposal.operation === "UPDATE" ? "UPDATED" : "CREATED", metadata: { title: record.title } });
  return result(proposal, record.id, record.title, "/follow-ups");
}

function validateIncluded(proposals: ImportProposal[]) {
  const ids = new Set(proposals.map((proposal) => proposal.id));
  for (const proposal of proposals) {
    for (const ref of ["companyProposalId", "applicationProposalId", "contactProposalId", "interviewProposalId"]) {
      const value = field(proposal, ref);
      const directIdKey = ref.replace("ProposalId", "Id");
      const directId = field(proposal, directIdKey);
      if (typeof value === "string" && value && !directId && !ids.has(value)) {
        logWarn("import_commit_validation_failed", { proposalId: proposal.id, entityType: proposal.entityType, missingReference: value });
        throw new ImportCommitError(`${proposal.entityType} references skipped proposal ${value}. Include that proposal or choose an existing record.`, 400, { proposalId: proposal.id, entityType: proposal.entityType });
      }
    }
  }
}

function result(proposal: ImportProposal, id: string, label: string, path: string) {
  return { proposalId: proposal.id, entityType: proposal.entityType, operation: proposal.operation, id, label, path };
}

function resolveId(proposal: ImportProposal, created: Map<string, string>, idKey: string, proposalKey: string, required = true) {
  const direct = field(proposal, idKey);
  if (typeof direct === "string" && direct) return direct;
  const proposalId = field(proposal, proposalKey);
  if (typeof proposalId === "string" && proposalId && created.has(proposalId)) return created.get(proposalId);
  if (required) throw new Error(`${proposal.entityType} is missing ${idKey}.`);
  return null;
}

function requiredExisting(proposal: ImportProposal) {
  if (!proposal.existingEntityId) throw new Error(`${proposal.entityType} update is missing existingEntityId.`);
  return proposal.existingEntityId;
}

function stringForOperation(proposal: ImportProposal, key: string) {
  const value = field(proposal, key);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (proposal.operation === "CREATE") throw new Error(`${proposal.entityType} is missing ${key}.`);
  return null;
}

function dateForOperation(proposal: ImportProposal, key: string) {
  const value = dateField(proposal, key);
  if (value) return value;
  if (proposal.operation === "CREATE") throw new Error(`${proposal.entityType} is missing ${key}.`);
  return null;
}

function numberForOperation(proposal: ImportProposal, key: string, fallback: number) {
  const value = numberField(proposal, key);
  if (typeof value === "number") return value;
  return proposal.operation === "CREATE" ? fallback : null;
}

function numberField(proposal: ImportProposal, key: string) {
  const value = field(proposal, key);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function textField(proposal: ImportProposal, key: string) {
  const value = field(proposal, key);
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string" && item.trim()).join(", ");
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function dateField(proposal: ImportProposal, key: string) {
  const value = field(proposal, key);
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function field(proposal: ImportProposal, key: string) {
  return proposal.proposedFields[key];
}

function stripNulls<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
