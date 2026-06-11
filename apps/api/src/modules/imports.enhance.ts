import type { AnalyzeImportInput, ImportAnalysisResult, ImportProposal } from "@interview-os/shared";

export function enhanceImportAnalysis(input: AnalyzeImportInput, analysis: ImportAnalysisResult): ImportAnalysisResult {
  if (input.sourceType === "unknown" && !input.context) return analysis;

  const proposals = analysis.proposals.map((proposal) => enhanceProposal(input, proposal));

  if (input.sourceType === "interview_notes" && !proposals.some((proposal) => proposal.entityType === "INTERVIEW_NOTE")) {
    proposals.push(createInterviewNoteProposal(input, proposals));
  }

  if (input.sourceType === "interview_notes" && !proposals.some((proposal) => proposal.entityType === "FOLLOW_UP")) {
    const followUp = createEndOfWeekFollowUp(input, proposals);
    if (followUp) proposals.push(followUp);
  }

  return { ...analysis, proposals: excludeBrokenReferences(proposals) };
}

function enhanceProposal(input: AnalyzeImportInput, proposal: ImportProposal): ImportProposal {
  const context = input.context;

  if (context?.application && proposal.entityType === "APPLICATION") {
    return {
      ...proposal,
      operation: "UPDATE",
      included: proposal.included,
      existingEntityId: context.application.id,
      matchReason: proposal.matchReason ?? "Uses selected application context.",
      proposedFields: {
        ...proposal.proposedFields,
        companyId: context.company?.id ?? proposal.proposedFields.companyId
      },
      warnings: [...new Set([...proposal.warnings, "Selected application context will be updated instead of creating a duplicate application."])]
    };
  }

  if (context?.interview && proposal.entityType === "INTERVIEW") {
    return {
      ...proposal,
      operation: "UPDATE",
      included: true,
      existingEntityId: context.interview.id,
      matchReason: proposal.matchReason ?? "Uses selected interview context.",
      proposedFields: {
        ...proposal.proposedFields,
        applicationId: context.interview.applicationId,
        rawPostInterviewNotes: proposal.proposedFields.rawPostInterviewNotes ?? input.rawText,
        outcome: proposal.proposedFields.outcome ?? inferInterviewOutcome(input.rawText)
      },
      missingFields: [],
      warnings: [...new Set([...proposal.warnings, "Selected interview context will be updated instead of creating a duplicate interview."])]
    };
  }

  if (context?.contact && proposal.entityType === "CONTACT") {
    return {
      ...proposal,
      operation: "UPDATE",
      existingEntityId: context.contact.id,
      matchReason: proposal.matchReason ?? "Uses selected contact context.",
      warnings: [...new Set([...proposal.warnings, "Selected contact context will be updated instead of creating a duplicate contact."])]
    };
  }

  if (proposal.entityType === "FOLLOW_UP") {
    return linkFollowUpToContext(input, proposal);
  }

  if (proposal.entityType === "INTERVIEW_NOTE") {
    return linkInterviewNoteToContext(input, proposal);
  }

  if (input.sourceType !== "interview_notes") return proposal;

  if (proposal.entityType === "APPLICATION" && proposal.operation === "CREATE") {
    if (!hasAny(proposal.proposedFields, ["companyId", "companyProposalId"]) || !hasField(proposal.proposedFields, "roleTitle")) {
      return exclude(proposal, "Application proposal was excluded because interview notes did not identify both company and role.");
    }
  }

  if (proposal.entityType === "INTERVIEW" && proposal.operation === "CREATE") {
    if (!hasAny(proposal.proposedFields, ["applicationId", "applicationProposalId"]) || !hasField(proposal.proposedFields, "scheduledAt")) {
      return exclude(proposal, "Interview proposal was excluded because the notes do not identify a linked application and scheduled time.");
    }
  }

  if (proposal.entityType === "CONTACT" && proposal.operation === "CREATE") {
    if (!hasAny(proposal.proposedFields, ["companyId", "companyProposalId", "applicationId", "applicationProposalId"])) {
      return exclude(proposal, "Contact proposal was excluded because it is not linked to a company or application.");
    }
  }

  return proposal;
}

function linkInterviewNoteToContext(input: AnalyzeImportInput, proposal: ImportProposal): ImportProposal {
  if (!input.context?.interview) return proposal;
  return {
    ...proposal,
    included: true,
    proposedFields: {
      ...proposal.proposedFields,
      interviewId: input.context.interview.id,
      type: proposal.proposedFields.type ?? "RAW_POST_INTERVIEW",
      body: proposal.proposedFields.body ?? input.rawText
    },
    missingFields: proposal.missingFields.filter((field) => !["interviewId", "interviewProposalId"].includes(field)),
    warnings: [...new Set([...proposal.warnings, "Selected interview context will receive this note."])]
  };
}

function linkFollowUpToContext(input: AnalyzeImportInput, proposal: ImportProposal): ImportProposal {
  const proposedFields = { ...proposal.proposedFields };
  if (input.context?.application) proposedFields.applicationId = input.context.application.id;
  if (input.context?.interview) {
    proposedFields.interviewId = input.context.interview.id;
    proposedFields.applicationId ??= input.context.interview.applicationId;
  }
  if (input.context?.contact) proposedFields.contactId = input.context.contact.id;
  return { ...proposal, proposedFields };
}

function createInterviewNoteProposal(input: AnalyzeImportInput, proposals: ImportProposal[]): ImportProposal {
  const linkedInterview = input.context?.interview;
  const proposedFields: Record<string, unknown> = { type: "RAW_POST_INTERVIEW", body: input.rawText };
  if (linkedInterview) proposedFields.interviewId = linkedInterview.id;

  return {
    id: uniqueId("interview-note", proposals),
    entityType: "INTERVIEW_NOTE",
    operation: "CREATE",
    included: Boolean(linkedInterview),
    confidence: 0.9,
    matchReason: null,
    existingEntityId: null,
    proposedFields,
    missingFields: linkedInterview ? [] : ["interviewId"],
    warnings: [linkedInterview ? "Review the linked interview before committing this note." : "Select an existing interview before committing this note."]
  };
}

function createEndOfWeekFollowUp(input: AnalyzeImportInput, proposals: ImportProposal[]): ImportProposal | null {
  if (!/\b(?:eow|end of week|end-of-week)\b/i.test(input.rawText)) return null;
  const dueAt = inferEndOfWeek(input.rawText);
  if (!dueAt) return null;
  const application = proposals.find((proposal) => proposal.entityType === "APPLICATION" && proposal.included);
  const proposedFields: Record<string, unknown> = {
    title: "Follow up on interview outcome",
    dueAt,
    priority: "MEDIUM",
    type: "CHECK_IN",
    notes: input.rawText
  };
  if (input.context?.application) proposedFields.applicationId = input.context.application.id;
  else if (input.context?.interview) proposedFields.applicationId = input.context.interview.applicationId;
  else if (application) proposedFields.applicationProposalId = application.id;
  if (input.context?.interview) proposedFields.interviewId = input.context.interview.id;

  return {
    id: uniqueId("follow-up", proposals),
    entityType: "FOLLOW_UP",
    operation: "CREATE",
    included: true,
    confidence: 0.72,
    matchReason: "Inferred from end-of-week response timing in interview notes.",
    existingEntityId: null,
    proposedFields,
    missingFields: [],
    warnings: proposedFields.applicationId || proposedFields.applicationProposalId ? [] : ["No application was matched; this follow-up will be created without an application link."]
  };
}

function inferInterviewOutcome(rawText: string) {
  if (/\b(done|completed|finished|wrapped)\b/i.test(rawText)) return "COMPLETED";
  return "SCHEDULED";
}

function inferEndOfWeek(rawText: string) {
  const today = rawText.match(/\btoday\s+is\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\b/i);
  if (!today) return null;
  const month = Number(today[1]);
  const day = Number(today[2]);
  const year = Number(today[3]);
  const date = new Date(year, month - 1, day, 17, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  const friday = 5;
  const daysUntilFriday = (friday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilFriday);
  return date.toISOString();
}

function excludeBrokenReferences(proposals: ImportProposal[]) {
  const includedIds = new Set(proposals.filter((proposal) => proposal.included).map((proposal) => proposal.id));
  return proposals.map((proposal) => {
    if (!proposal.included) return proposal;
    const referencesExcluded = ["companyProposalId", "applicationProposalId", "contactProposalId", "interviewProposalId"].some((key) => {
      const value = proposal.proposedFields[key];
      return typeof value === "string" && value && !includedIds.has(value);
    });
    return referencesExcluded ? exclude(proposal, "Proposal was excluded because it references another excluded proposal.") : proposal;
  });
}

function exclude(proposal: ImportProposal, warning: string): ImportProposal {
  return { ...proposal, included: false, warnings: [...new Set([...proposal.warnings, warning])] };
}

function uniqueId(prefix: string, proposals: ImportProposal[]) {
  const existing = new Set(proposals.map((proposal) => proposal.id));
  let index = 1;
  while (existing.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function hasAny(fields: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => hasField(fields, key));
}

function hasField(fields: Record<string, unknown>, key: string) {
  const value = fields[key];
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}
