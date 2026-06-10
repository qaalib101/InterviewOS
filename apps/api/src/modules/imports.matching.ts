import type { ImportAnalysisResult, ImportProposal } from "@interview-os/shared";
import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "company" | "contact" | "application" | "interview">;

export async function applyLocalMatches(db: Db, userId: string, analysis: ImportAnalysisResult): Promise<ImportAnalysisResult> {
  const proposals: ImportProposal[] = [];

  for (const proposal of dedupeProposals(analysis.proposals)) {
    proposals.push(await matchProposal(db, userId, proposal));
  }

  return { ...analysis, proposals };
}

async function matchProposal(db: Db, userId: string, proposal: ImportProposal): Promise<ImportProposal> {
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
    const companyName = await proposalCompanyName(db, userId, proposal);
    const match = apps.find((app) => normalize(app.roleTitle) === normalize(roleTitle) && (!companyName || normalize(app.company.name) === normalize(companyName)));
    if (match) return asUpdate(proposal, match.id, "Matched existing application by company and role title.");
  }

  if (proposal.entityType === "INTERVIEW") {
    const existingApplicationId = stringField(proposal, "applicationId");
    const scheduledAt = stringField(proposal, "scheduledAt");
    const type = stringField(proposal, "type");
    if (existingApplicationId && scheduledAt) {
      const interview = await db.interview.findFirst({ where: { userId, applicationId: existingApplicationId, scheduledAt: new Date(scheduledAt), type: type as any } });
      if (interview) return asUpdate(proposal, interview.id, "Matched existing interview by application, scheduled time, and type.");
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
  return { ...proposal, operation: "UPDATE", existingEntityId, matchReason, confidence: Math.max(proposal.confidence, 0.82) };
}

async function proposalCompanyName(db: Db, userId: string, proposal: ImportProposal) {
  const companyId = stringField(proposal, "companyId");
  if (companyId) return (await db.company.findFirst({ where: { id: companyId, userId } }))?.name ?? null;
  return null;
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
