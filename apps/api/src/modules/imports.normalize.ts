import { importAnalysisResultSchema, type ImportAnalysisResult } from "@interview-os/shared";

export function normalizeImportAnalysis(input: unknown): ImportAnalysisResult {
  const raw = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const rawProposals = Array.isArray(raw.proposals) ? raw.proposals : [];
  const proposalIds = new Set(rawProposals.map((proposal, index) => proposalId(proposal, index)));
  const proposals = rawProposals.map((proposal, index) => normalizeProposal(proposal, index, proposalIds));

  return importAnalysisResultSchema.parse({
    summary: typeof raw.summary === "string" ? raw.summary : "",
    proposals: normalizeDependencies(proposals)
  });
}

function normalizeProposal(input: unknown, index: number, proposalIds: Set<string>) {
  const raw = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const entityType = normalizeEnum(raw.entityType, "COMPANY");
  const proposedFields = normalizeProposedFields(entityType, raw.proposedFields, proposalIds);
  const missingFields = normalizeStringArray(raw.missingFields);
  const warnings = normalizeStringArray(raw.warnings);
  const included = typeof raw.included === "boolean" ? raw.included : raw.operation !== "SKIP";
  const proposal = {
    id: proposalId(raw, index),
    entityType,
    operation: normalizeEnum(raw.operation, "CREATE"),
    included,
    confidence: typeof raw.confidence === "number" || typeof raw.confidence === "string" ? raw.confidence : 0.5,
    matchReason: stringifyOptional(raw.matchReason),
    existingEntityId: stringifyOptional(raw.existingEntityId),
    proposedFields,
    missingFields,
    warnings
  };

  return normalizeRequiredFields(proposal);
}

function normalizeProposedFields(entityType: string, value: unknown, proposalIds: Set<string>) {
  const fields = typeof value === "object" && value !== null ? { ...value as Record<string, unknown> } : {};

  if (entityType === "APPLICATION" && fields.roleTitle === undefined && typeof fields.title === "string") {
    fields.roleTitle = fields.title;
    delete fields.title;
  }
  if (entityType === "APPLICATION") {
    normalizeCompensationFields(fields);
    normalizeFieldEnum(fields, "stage", applicationStageMap, "SAVED");
    normalizeFieldEnum(fields, "remoteMode", remoteModeMap, "UNKNOWN");
    normalizeFieldEnum(fields, "priority", priorityMap, "MEDIUM");
  }

  if (entityType === "CONTACT" && fields.role === undefined && typeof fields.title === "string") {
    fields.role = fields.title;
    delete fields.title;
  }

  if (entityType === "CONTACT" && fields.name === undefined) {
    const name = [fields.firstName, fields.lastName].filter((part) => typeof part === "string" && part.trim()).join(" ").trim();
    if (name) fields.name = name;
    delete fields.firstName;
    delete fields.lastName;
  }

  if (entityType === "INTERVIEW") {
    if (fields.roundName === undefined && typeof fields.stage === "string") {
      fields.roundName = fields.stage;
      delete fields.stage;
    }
    if (fields.scheduledAt === undefined) {
      const scheduledAt = normalizeScheduledAt(fields.date, fields.time);
      if (scheduledAt) fields.scheduledAt = scheduledAt;
    }
    if (fields.outcome === undefined && typeof fields.status === "string") {
      fields.outcome = normalizeOutcome(fields.status);
      delete fields.status;
    }
    normalizeFieldEnum(fields, "type", interviewTypeMap, "OTHER");
    normalizeFieldEnum(fields, "format", interviewFormatMap, "OTHER");
    normalizeFieldEnum(fields, "outcome", interviewOutcomeMap, "SCHEDULED");
  }

  if (entityType === "INTERVIEW_NOTE" && fields.body === undefined && typeof fields.content === "string") {
    fields.body = fields.content;
    delete fields.content;
  }
  if (entityType === "INTERVIEW_NOTE") {
    normalizeFieldEnum(fields, "type", interviewNoteTypeMap, "RAW_POST_INTERVIEW");
  }

  if (entityType === "FOLLOW_UP") {
    if (fields.title === undefined && typeof fields.action === "string") {
      fields.title = fields.action;
      delete fields.action;
    }
    if (fields.dueAt === undefined && typeof fields.dueDate === "string") {
      fields.dueAt = fields.dueDate;
      delete fields.dueDate;
    }
    normalizeFieldEnum(fields, "priority", priorityMap, "MEDIUM");
    normalizeFieldEnum(fields, "type", followUpTypeMap, "OTHER");
  }

  normalizeProposalReference(fields, proposalIds, "companyId", "companyProposalId");
  normalizeProposalReference(fields, proposalIds, "applicationId", "applicationProposalId");
  normalizeProposalReference(fields, proposalIds, "contactId", "contactProposalId");
  normalizeProposalReference(fields, proposalIds, "interviewId", "interviewProposalId");

  return fields;
}

function normalizeRequiredFields<T extends { entityType: string; operation: string; included: boolean; proposedFields: Record<string, unknown>; missingFields: string[]; warnings: string[] }>(proposal: T) {
  if (proposal.operation !== "CREATE") return proposal;
  const missing = new Set(proposal.missingFields.filter((fieldName) => !missingFieldIsSatisfied(fieldName, proposal.proposedFields)));
  const requiredMissing: string[] = [];
  let warnings = proposal.warnings;

  for (const group of requiredFieldGroups(proposal.entityType)) {
    if (!group.some((fieldName) => hasField(proposal.proposedFields, fieldName))) {
      const fieldName = group.join(" or ");
      missing.add(fieldName);
      requiredMissing.push(fieldName);
    }
  }

  if (proposal.included && requiredMissing.length > 0 && shouldExcludeWhenMissing(proposal.entityType)) {
    proposal.included = false;
    warnings = [...warnings, "Proposal was excluded because required fields are missing. Review and complete the fields before committing."];
  }

  proposal.missingFields = [...missing];
  proposal.warnings = [...new Set(warnings)];
  return proposal;
}

function normalizeDependencies<T extends { id: string; included: boolean; proposedFields: Record<string, unknown>; warnings: string[] }>(proposals: T[]) {
  const includedIds = new Set(proposals.filter((proposal) => proposal.included).map((proposal) => proposal.id));
  return proposals.map((proposal) => {
    const referencedSkipped = ["companyProposalId", "applicationProposalId", "contactProposalId", "interviewProposalId"].some((key) => {
      const value = proposal.proposedFields[key];
      return typeof value === "string" && value && !includedIds.has(value);
    });
    if (!proposal.included || !referencedSkipped) return proposal;
    return {
      ...proposal,
      included: false,
      warnings: [...proposal.warnings, "Proposal was excluded because it references another excluded proposal."]
    };
  });
}

function proposalId(input: unknown, index: number) {
  const raw = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  return typeof raw.id === "string" && raw.id.trim() ? raw.id : `${normalizeEnum(raw.entityType, "COMPANY").toLowerCase()}-${index + 1}`;
}

function normalizeProposalReference(fields: Record<string, unknown>, proposalIds: Set<string>, idKey: string, proposalKey: string) {
  const value = fields[idKey];
  if (fields[proposalKey] === undefined && typeof value === "string" && proposalIds.has(value)) {
    fields[proposalKey] = value;
    delete fields[idKey];
  }
}

function normalizeScheduledAt(date: unknown, time: unknown) {
  if (typeof date !== "string" || !date.trim()) return null;
  const value = typeof time === "string" && time.trim() ? `${date} ${time}` : date;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeOutcome(value: string) {
  if (/complete|completed|done/i.test(value)) return "COMPLETED";
  if (/cancel/i.test(value)) return "CANCELED";
  if (/pending|scheduled|plan/i.test(value)) return "SCHEDULED";
  return "SCHEDULED";
}

function normalizeCompensationFields(fields: Record<string, unknown>) {
  if (fields.compensationMin === undefined) fields.compensationMin = firstDefined(fields.salaryMin, fields.baseSalaryMin, fields.minSalary);
  if (fields.compensationMax === undefined) fields.compensationMax = firstDefined(fields.salaryMax, fields.baseSalaryMax, fields.maxSalary);
  fields.compensationMin = normalizeMoney(fields.compensationMin);
  fields.compensationMax = normalizeMoney(fields.compensationMax);
  delete fields.salaryMin;
  delete fields.salaryMax;
  delete fields.baseSalaryMin;
  delete fields.baseSalaryMax;
  delete fields.minSalary;
  delete fields.maxSalary;
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value < 1000 ? value * 1000 : value;
  if (typeof value !== "string" || !value.trim()) return value;
  const compact = value.trim().toLowerCase().replace(/[$,\s]/g, "");
  const match = compact.match(/^(\d+(?:\.\d+)?)(k)?$/);
  if (!match) return value;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return value;
  return match[2] || amount < 1000 ? Math.round(amount * 1000) : Math.round(amount);
}

function normalizeFieldEnum(fields: Record<string, unknown>, key: string, values: Record<string, string>, fallback: string) {
  if (fields[key] === undefined || fields[key] === null || fields[key] === "") return;
  if (typeof fields[key] !== "string") return;
  fields[key] = normalizeKnownValue(fields[key], values, fallback);
}

function normalizeKnownValue(value: string, values: Record<string, string>, fallback: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return values[normalized] ?? fallback;
}

function requiredFieldGroups(entityType: string) {
  if (entityType === "COMPANY") return [["name"]];
  if (entityType === "APPLICATION") return [["companyProposalId", "companyId"], ["roleTitle"]];
  if (entityType === "CONTACT") return [["name"]];
  if (entityType === "INTERVIEW") return [["applicationProposalId", "applicationId"], ["roundName"], ["scheduledAt"]];
  if (entityType === "INTERVIEW_NOTE") return [["interviewProposalId", "interviewId"], ["body"]];
  if (entityType === "FOLLOW_UP") return [["title"], ["dueAt"]];
  return [];
}

function shouldExcludeWhenMissing(entityType: string) {
  return ["INTERVIEW", "INTERVIEW_NOTE", "FOLLOW_UP"].includes(entityType);
}

function hasField(fields: Record<string, unknown>, key: string) {
  const value = fields[key];
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function missingFieldIsSatisfied(fieldName: string, fields: Record<string, unknown>) {
  const options = fieldName.split(/\s+or\s+/i).flatMap((value) => missingFieldAliases(value.trim())).filter(Boolean);
  return options.length > 0 && options.some((option) => hasField(fields, option));
}

function missingFieldAliases(fieldName: string) {
  if (fieldName === "companyProposalId") return ["companyProposalId", "companyId"];
  if (fieldName === "companyId") return ["companyId", "companyProposalId"];
  if (fieldName === "applicationProposalId") return ["applicationProposalId", "applicationId"];
  if (fieldName === "applicationId") return ["applicationId", "applicationProposalId"];
  if (fieldName === "contactProposalId") return ["contactProposalId", "contactId"];
  if (fieldName === "contactId") return ["contactId", "contactProposalId"];
  if (fieldName === "interviewProposalId") return ["interviewProposalId", "interviewId"];
  if (fieldName === "interviewId") return ["interviewId", "interviewProposalId"];
  return [fieldName];
}

const applicationStageMap: Record<string, string> = {
  saved: "SAVED",
  applied: "APPLIED",
  apply: "APPLIED",
  recruiter: "RECRUITER_SCREEN",
  recruiter_screen: "RECRUITER_SCREEN",
  phone_screen: "RECRUITER_SCREEN",
  screen: "RECRUITER_SCREEN",
  initial_screen: "RECRUITER_SCREEN",
  tech_screen: "TECH_SCREEN",
  technical_screen: "TECH_SCREEN",
  technical: "TECH_SCREEN",
  onsite: "ONSITE",
  on_site: "ONSITE",
  final: "ONSITE",
  offer: "OFFER",
  rejected: "REJECTED",
  withdrawn: "WITHDRAWN",
  archived: "ARCHIVED"
};

const remoteModeMap: Record<string, string> = {
  remote: "REMOTE",
  hybrid: "HYBRID",
  onsite: "ONSITE",
  on_site: "ONSITE",
  in_person: "ONSITE",
  unknown: "UNKNOWN"
};

const priorityMap: Record<string, string> = {
  low: "LOW",
  medium: "MEDIUM",
  normal: "MEDIUM",
  high: "HIGH"
};

const interviewTypeMap: Record<string, string> = {
  behavioral: "BEHAVIORAL",
  behaviour: "BEHAVIORAL",
  technical: "TECHNICAL",
  coding: "TECHNICAL",
  system_design: "SYSTEM_DESIGN",
  design: "SYSTEM_DESIGN",
  hiring_manager: "HIRING_MANAGER",
  manager: "HIRING_MANAGER",
  recruiter: "RECRUITER",
  recruiter_screen: "RECRUITER",
  panel: "PANEL",
  other: "OTHER"
};

const interviewFormatMap: Record<string, string> = {
  phone: "PHONE",
  call: "PHONE",
  video: "VIDEO",
  zoom: "VIDEO",
  google_meet: "VIDEO",
  teams: "VIDEO",
  onsite: "ONSITE",
  on_site: "ONSITE",
  in_person: "ONSITE",
  take_home: "TAKE_HOME",
  takehome: "TAKE_HOME",
  other: "OTHER"
};

const interviewOutcomeMap: Record<string, string> = {
  scheduled: "SCHEDULED",
  pending: "SCHEDULED",
  planned: "SCHEDULED",
  completed: "COMPLETED",
  complete: "COMPLETED",
  passed: "PASSED",
  failed: "FAILED",
  rejected: "FAILED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  unknown: "UNKNOWN"
};

const interviewNoteTypeMap: Record<string, string> = {
  prep: "PREP",
  preparation: "PREP",
  raw_post_interview: "RAW_POST_INTERVIEW",
  post_interview: "RAW_POST_INTERVIEW",
  raw: "RAW_POST_INTERVIEW",
  structured_analysis: "STRUCTURED_ANALYSIS",
  analysis: "STRUCTURED_ANALYSIS",
  feedback: "FEEDBACK",
  follow_up_draft: "FOLLOW_UP_DRAFT",
  followup_draft: "FOLLOW_UP_DRAFT"
};

const followUpTypeMap: Record<string, string> = {
  email: "EMAIL",
  linkedin: "LINKEDIN",
  linked_in: "LINKEDIN",
  thank_you: "THANK_YOU",
  thank_you_note: "THANK_YOU",
  check_in: "CHECK_IN",
  checkin: "CHECK_IN",
  prep_task: "PREP_TASK",
  preparation: "PREP_TASK",
  other: "OTHER"
};

function normalizeEnum(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : fallback;
}

function stringifyOptional(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}
