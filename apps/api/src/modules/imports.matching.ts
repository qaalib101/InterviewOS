import type { ImportAnalysisResult, ImportProposal } from "@interview-os/shared";
import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "company" | "contact" | "application" | "interview">;
type ProposalMatch = { entityType: ImportProposal["entityType"]; id: string };

const brokenReferenceWarning = "Proposal was excluded because it references another excluded proposal.";

export async function applyLocalMatches(db: Db, userId: string, analysis: ImportAnalysisResult): Promise<ImportAnalysisResult> {
  const proposals: ImportProposal[] = [];
  const matches = new Map<string, ProposalMatch>();

  for (const proposal of dedupeProposals(analysis.proposals)) {
    const matched = await matchProposal(db, userId, proposal, matches);
    if (matched.existingEntityId) matches.set(matched.id, { entityType: matched.entityType, id: matched.existingEntityId });
    proposals.push(matched);
  }

  const linked = rewriteMatchedReferences(proposals, matches);
  const refined = await pruneNoOpUpdates(db, userId, linked);

  return { ...analysis, proposals: repairResolvedReferences(refined) };
}

async function matchProposal(db: Db, userId: string, proposal: ImportProposal, matches: Map<string, ProposalMatch>): Promise<ImportProposal> {
  if (proposal.operation === "SKIP" || proposal.existingEntityId) return proposal;

  if (proposal.entityType === "COMPANY") {
    const name = stringField(proposal, "name");
    const website = stringField(proposal, "website");
    const companies = await db.company.findMany({ where: { userId } });
    const match = companies.find((company) => normalize(company.name) === normalize(name)) ?? companies.find((company) => domain(company.website) && domain(company.website) === domain(website));
    if (match) return asUpdate(proposal, match.id, "Matched existing company by normalized name or website domain.");
  }

  if (proposal.entityType === "CONTACT") {
    const email = stringField(proposal, "email");
    const name = stringField(proposal, "name");
    const contacts = await db.contact.findMany({ where: { userId } });
    const match = email ? contacts.find((contact) => contact.email?.toLowerCase() === email.toLowerCase()) : contacts.find((contact) => normalize(contact.name) === normalize(name));
    if (match) return asUpdate(proposal, match.id, email ? "Matched existing contact by email." : "Matched existing contact by normalized name.");
  }

  if (proposal.entityType === "APPLICATION") {
    const roleTitle = stringField(proposal, "roleTitle");
    const apps = await db.application.findMany({ where: { userId }, include: { company: true } });
    const company = await proposalCompany(db, userId, proposal, matches);
    const meaningfulRoleTitle = meaningfulApplicationRole(roleTitle);
    const exactMatch = meaningfulRoleTitle
      ? apps.find((app) => normalize(app.roleTitle) === normalize(meaningfulRoleTitle) && (!company?.name || normalize(app.company.name) === normalize(company.name)))
      : null;
    if (exactMatch) return asUpdate(cleanMatchedApplication(proposal), exactMatch.id, "Matched existing application by company and role title.");

    if (company) {
      const activeApps = apps.filter((app) => app.companyId === company.id && isActiveStage(String(app.stage)));
      const compatibleApps = meaningfulRoleTitle ? activeApps.filter((app) => compatibleRoleTitles(app.roleTitle, meaningfulRoleTitle)) : [];
      if (compatibleApps.length === 1) {
        return asUpdate(proposal, compatibleApps[0].id, "Matched existing active application by company and compatible role title.");
      }
      if (!meaningfulRoleTitle && activeApps.length === 1) {
        return asUpdate(cleanMatchedApplication(proposal), activeApps[0].id, "Matched existing active application by company because the import did not include a role title.");
      }
      if (!meaningfulRoleTitle && activeApps.length > 1) {
        return withWarning(proposal, "Multiple active applications exist for this company. Select the correct application before committing.");
      }
    }
  }

  if (proposal.entityType === "INTERVIEW") {
    const existingApplicationId = proposalApplicationId(proposal, matches);
    const scheduledAt = stringField(proposal, "scheduledAt");
    const type = stringField(proposal, "type");
    if (existingApplicationId && scheduledAt) {
      const interview = await db.interview.findFirst({ where: stripUndefined({ userId, applicationId: existingApplicationId, scheduledAt: new Date(scheduledAt), type: type as any }) });
      if (interview) return asUpdate(proposal, interview.id, type ? "Matched existing interview by application, scheduled time, and type." : "Matched existing interview by application and scheduled time.");
    }
  }

  return proposal;
}

function dedupeProposals(proposals: ImportProposal[]) {
  const seen = new Set<string>();
  return proposals.filter((proposal) => {
    const key = `${proposal.entityType}:${proposal.operation}:${JSON.stringify(proposal.proposedFields)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asUpdate(proposal: ImportProposal, existingEntityId: string, matchReason: string): ImportProposal {
  return {
    ...proposal,
    operation: "UPDATE",
    included: true,
    existingEntityId,
    matchReason,
    missingFields: [],
    warnings: proposal.warnings.filter((warning) => warning !== brokenReferenceWarning),
    confidence: Math.max(proposal.confidence, 0.82)
  };
}

async function pruneNoOpUpdates(db: Db, userId: string, proposals: ImportProposal[]) {
  const refined: ImportProposal[] = [];

  for (const proposal of proposals) {
    if (proposal.operation !== "UPDATE" || !proposal.existingEntityId) {
      refined.push(proposal);
      continue;
    }

    const existing = await existingRecord(db, userId, proposal);
    if (!existing) {
      refined.push(proposal);
      continue;
    }

    const proposedFields = changedFields(proposal, existing);
    if (Object.keys(proposedFields).length === 0) {
      refined.push({
        ...proposal,
        operation: "SKIP",
        included: false,
        proposedFields: {},
        missingFields: [],
        matchReason: `${proposal.matchReason ?? "Matched existing record."} No changes needed.`
      });
      continue;
    }

    refined.push({ ...proposal, proposedFields });
  }

  return refined;
}

async function existingRecord(db: Db, userId: string, proposal: ImportProposal) {
  const id = proposal.existingEntityId;
  if (!id) return null;
  const where = { id, userId };
  if (proposal.entityType === "COMPANY") return db.company.findFirst({ where });
  if (proposal.entityType === "APPLICATION") return db.application.findFirst({ where });
  if (proposal.entityType === "CONTACT") return db.contact.findFirst({ where });
  if (proposal.entityType === "INTERVIEW") return db.interview.findFirst({ where });
  return null;
}

function changedFields(proposal: ImportProposal, existing: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};

  for (const key of mutableFields(proposal.entityType)) {
    const proposed = proposal.proposedFields[key];
    if (proposed === undefined || proposed === null || proposed === "") continue;
    if (sameValue(proposed, existing[key])) continue;
    fields[key] = proposed;
  }

  if (isNotesOnlyContextUpdate(proposal.entityType, fields)) return {};
  return fields;
}

function mutableFields(entityType: ImportProposal["entityType"]) {
  if (entityType === "COMPANY") return ["name", "website", "industry", "location", "notes"];
  if (entityType === "APPLICATION") return ["companyId", "roleTitle", "jobUrl", "source", "stage", "compensationMin", "compensationMax", "remoteMode", "priority", "concerns", "nextAction", "nextActionAt", "notes"];
  if (entityType === "CONTACT") return ["companyId", "applicationId", "name", "role", "email", "phone", "linkedinUrl", "notes"];
  if (entityType === "INTERVIEW") return ["applicationId", "roundName", "roundNumber", "type", "format", "scheduledAt", "durationMinutes", "interviewers", "expectedTopics", "prepNotes", "rawPostInterviewNotes", "outcome"];
  return [];
}

function isNotesOnlyContextUpdate(entityType: ImportProposal["entityType"], fields: Record<string, unknown>) {
  if (!["COMPANY", "APPLICATION", "CONTACT"].includes(entityType)) return false;
  const keys = Object.keys(fields);
  return keys.length === 1 && keys[0] === "notes";
}

function sameValue(proposed: unknown, existing: unknown) {
  if (existing instanceof Date && typeof proposed === "string") return existing.getTime() === new Date(proposed).getTime();
  if (Array.isArray(proposed) || Array.isArray(existing)) return JSON.stringify(proposed ?? []) === JSON.stringify(existing ?? []);
  if (typeof proposed === "string" && typeof existing === "string") return proposed.trim() === existing.trim();
  return proposed === existing;
}

function rewriteMatchedReferences(proposals: ImportProposal[], matches: Map<string, ProposalMatch>) {
  return proposals.map((proposal) => ({
    ...proposal,
    proposedFields: rewriteFields(proposal.proposedFields, matches)
  }));
}

function rewriteFields(fields: Record<string, unknown>, matches: Map<string, ProposalMatch>) {
  const next = { ...fields };
  rewriteReference(next, matches, "companyProposalId", "companyId", "COMPANY");
  rewriteReference(next, matches, "applicationProposalId", "applicationId", "APPLICATION");
  rewriteReference(next, matches, "contactProposalId", "contactId", "CONTACT");
  rewriteReference(next, matches, "interviewProposalId", "interviewId", "INTERVIEW");
  return next;
}

function rewriteReference(fields: Record<string, unknown>, matches: Map<string, ProposalMatch>, proposalKey: string, idKey: string, entityType: ImportProposal["entityType"]) {
  const proposalId = fields[proposalKey];
  if (typeof proposalId !== "string") return;
  const match = matches.get(proposalId);
  if (match?.entityType !== entityType) return;
  fields[idKey] = match.id;
  delete fields[proposalKey];
}

function proposalApplicationId(proposal: ImportProposal, matches: Map<string, ProposalMatch>) {
  const applicationId = stringField(proposal, "applicationId");
  if (applicationId) return applicationId;

  const applicationProposalId = stringField(proposal, "applicationProposalId");
  const matchedApplication = applicationProposalId ? matches.get(applicationProposalId) : null;
  return matchedApplication?.entityType === "APPLICATION" ? matchedApplication.id : null;
}

async function proposalCompany(db: Db, userId: string, proposal: ImportProposal, matches: Map<string, ProposalMatch>) {
  const companyId = stringField(proposal, "companyId");
  if (companyId) return await db.company.findFirst({ where: { id: companyId, userId } });

  const companyProposalId = stringField(proposal, "companyProposalId");
  const matchedCompany = companyProposalId ? matches.get(companyProposalId) : null;
  if (matchedCompany?.entityType === "COMPANY") return await db.company.findFirst({ where: { id: matchedCompany.id, userId } });

  return null;
}

function repairResolvedReferences(proposals: ImportProposal[]) {
  let includedIds = new Set(proposals.filter((proposal) => proposal.included).map((proposal) => proposal.id));
  return proposals.map((proposal) => {
    if (proposal.included || !proposal.warnings.includes(brokenReferenceWarning)) return proposal;
    if (referencedProposalIds(proposal).some((id) => !includedIds.has(id))) return proposal;

    const repaired = { ...proposal, included: true, warnings: proposal.warnings.filter((warning) => warning !== brokenReferenceWarning) };
    includedIds = new Set([...includedIds, repaired.id]);
    return repaired;
  });
}

function referencedProposalIds(proposal: ImportProposal) {
  return ["companyProposalId", "applicationProposalId", "contactProposalId", "interviewProposalId"]
    .map((key) => stringField(proposal, key))
    .filter((value): value is string => Boolean(value));
}

function cleanMatchedApplication(proposal: ImportProposal): ImportProposal {
  const fields = { ...proposal.proposedFields };
  if (!meaningfulApplicationRole(stringField(proposal, "roleTitle"))) delete fields.roleTitle;
  return { ...proposal, proposedFields: fields };
}

function meaningfulApplicationRole(value: string | null) {
  if (!value) return null;
  return /^(unknown|unspecified|unspecified role|unknown role|n\/a|na)$/i.test(value.trim()) ? null : value;
}

function compatibleRoleTitles(existing: string, proposed: string) {
  const existingNormalized = normalize(existing);
  const proposedNormalized = normalize(proposed);
  return existingNormalized.length >= 8 && proposedNormalized.length >= 8 && (existingNormalized.includes(proposedNormalized) || proposedNormalized.includes(existingNormalized));
}

function isActiveStage(stage: string) {
  return !["REJECTED", "WITHDRAWN", "ARCHIVED"].includes(stage);
}

function withWarning(proposal: ImportProposal, warning: string): ImportProposal {
  return { ...proposal, warnings: [...new Set([...proposal.warnings, warning])] };
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null)) as Partial<T>;
}

function stringField(proposal: ImportProposal, key: string) {
  const value = proposal.proposedFields[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function domain(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
