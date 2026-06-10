import type { AnalyzeImportInput, ImportAnalysisResult, ImportProposal } from "@interview-os/shared";
import type { AiProvider } from "./aiProvider.js";

export class MockAiProvider implements AiProvider {
  name = "mock" as const;

  status() {
    return { provider: this.name, available: true, message: "Mock AI provider is active." };
  }

  async analyzeImport(input: AnalyzeImportInput): Promise<ImportAnalysisResult> {
    const text = input.rawText;
    const explicitEmployerCompanyName = findEmployerCompany(text);
    const fallbackCompany = findCompany(text);
    const recruiterCompanyName = findRecruiterCompany(text, explicitEmployerCompanyName);
    const employerCompanyName = explicitEmployerCompanyName ?? (recruiterCompanyName ? fallbackClientName(recruiterCompanyName) : fallbackCompany ?? fallbackCompanyName());
    const roleTitle = findRole(text) ?? "Unspecified Role";
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const contactName = findContactName(text) ?? "Unknown Contact";
    const warnings: string[] = [];
    const proposals: ImportProposal[] = [];

    if (!explicitEmployerCompanyName && recruiterCompanyName) {
      warnings.push("The employer/client company was not clear. A separate unknown client company was proposed so the application is not assigned to the recruiter agency.");
    } else if (!explicitEmployerCompanyName && !fallbackCompany) {
      warnings.push("Company name was not clear. A fallback company name was proposed.");
    }

    proposals.push({
      id: "company-1",
      entityType: "COMPANY",
      operation: "CREATE",
      included: true,
      confidence: employerCompanyName.startsWith("Unknown") ? 0.35 : 0.78,
      matchReason: null,
      existingEntityId: null,
      proposedFields: { name: employerCompanyName },
      missingFields: employerCompanyName.startsWith("Unknown") ? ["name"] : [],
      warnings: [...warnings]
    });

    if (recruiterCompanyName && normalize(recruiterCompanyName) !== normalize(employerCompanyName)) {
      proposals.push({
        id: "recruiter-company-1",
        entityType: "COMPANY",
        operation: "CREATE",
        included: true,
        confidence: 0.72,
        matchReason: null,
        existingEntityId: null,
        proposedFields: { name: recruiterCompanyName, notes: "Recruiting firm inferred from import text." },
        missingFields: [],
        warnings: ["Recruiter company appears separate from the employer company. Confirm before committing."]
      });
    }

    proposals.push({
      id: "application-1",
      entityType: "APPLICATION",
      operation: "CREATE",
      included: true,
      confidence: roleTitle === "Unspecified Role" ? 0.35 : 0.72,
      matchReason: null,
      existingEntityId: null,
      proposedFields: {
        companyProposalId: "company-1",
        roleTitle,
        stage: input.sourceType === "job_description" ? "SAVED" : "RECRUITER_SCREEN",
        remoteMode: inferRemoteMode(text),
        priority: "MEDIUM",
        source: sourceLabel(input.sourceType),
        jobUrl: text.match(/https?:\/\/\S+/)?.[0] ?? null,
        notes: text.slice(0, 500)
      },
      missingFields: roleTitle === "Unspecified Role" ? ["roleTitle"] : [],
      warnings: roleTitle === "Unspecified Role" ? ["Role title was not clear. A fallback role title was proposed."] : []
    });

    if (email || contactName !== "Unknown Contact" || recruiterCompanyName || /recruiter|talent|sourcer|hiring/i.test(text)) {
      const contactCompanyProposalId = recruiterCompanyName && normalize(recruiterCompanyName) !== normalize(employerCompanyName) ? "recruiter-company-1" : "company-1";
      proposals.push({
        id: "contact-1",
        entityType: "CONTACT",
        operation: "CREATE",
        included: true,
        confidence: email ? 0.8 : 0.45,
        matchReason: null,
        existingEntityId: null,
        proposedFields: { companyProposalId: contactCompanyProposalId, applicationProposalId: "application-1", name: contactName, email, role: /recruiter|talent/i.test(text) ? "Recruiting Contact" : null },
        missingFields: contactName === "Unknown Contact" ? ["name"] : [],
        warnings: [
          ...(contactName === "Unknown Contact" ? ["Contact name was not clear. Confirm before creating this contact."] : []),
          ...(contactCompanyProposalId === "recruiter-company-1" ? ["Contact is linked to the recruiter company and the application for the employer company."] : [])
        ]
      });
    }

    if (input.sourceType === "interview_notes") {
      proposals.push({
        id: "interview-note-1",
        entityType: "INTERVIEW_NOTE",
        operation: "CREATE",
        included: true,
        confidence: 0.7,
        matchReason: null,
        existingEntityId: null,
        proposedFields: { applicationProposalId: "application-1", type: "RAW_POST_INTERVIEW", body: text },
        missingFields: ["interviewId"],
        warnings: ["No interview was confidently matched. Select or create an interview before committing this note."]
      });
    }

    if (/interview|screen|call|chat|meet/i.test(text) && input.sourceType !== "interview_notes") {
      proposals.push({
        id: "interview-1",
        entityType: "INTERVIEW",
        operation: "CREATE",
        included: false,
        confidence: 0.48,
        matchReason: null,
        existingEntityId: null,
        proposedFields: { applicationProposalId: "application-1", roundName: "Imported Interview", roundNumber: 1, type: "OTHER", format: "VIDEO", durationMinutes: 60, outcome: "SCHEDULED" },
        missingFields: ["scheduledAt"],
        warnings: ["Interview date/time was not clear. Add scheduledAt before including this proposal."]
      });
    }

    if (/follow up|reply|availability|available|thank|check in|next week|friday/i.test(text) || input.sourceType === "follow_up") {
      proposals.push({
        id: "follow-up-1",
        entityType: "FOLLOW_UP",
        operation: "CREATE",
        included: false,
        confidence: 0.55,
        matchReason: null,
        existingEntityId: null,
        proposedFields: { applicationProposalId: "application-1", contactProposalId: email ? "contact-1" : null, title: inferFollowUpTitle(text), priority: "MEDIUM", type: "OTHER", notes: text.slice(0, 500) },
        missingFields: ["dueAt"],
        warnings: ["Follow-up due date was not clear. Add dueAt before including this proposal."]
      });
    }

    return { summary: "Mock analysis generated structured import proposals for review.", proposals };
  }
}

function findEmployerCompany(text: string) {
  const patterns = [
    /(?:role|position|opportunity)\s+(?:at|with|for)\s+([A-Z][A-Za-z0-9&. -]{2,50})(?:\s|,|\.|$)/i,
    /(?:client|employer|hiring company)\s+(?:is|at|with|for)\s+([A-Z][A-Za-z0-9&. -]{2,50})(?:\s|,|\.|$)/i,
    /(?:client|employer|hiring company):\s*([A-Z][A-Za-z0-9&. -]{2,50})(?:\s|,|\.|$)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanCompany(match[1]);
  }
  return null;
}

function findRecruiterCompany(text: string, employerCompanyName?: string | null) {
  const patterns = [
    /(?:I|we)\s+(?:am|are)\s+(?:a\s+)?(?:recruiter|sourcer|talent partner)\s+(?:at|with|from)\s+([A-Z][A-Za-z0-9&. -]{2,50})(?:\s|,|\.|$)/i,
    /(?:from|at)\s+([A-Z][A-Za-z0-9&. -]{2,50})\s+(?:recruiting|staffing|search|talent)/i,
    /([A-Z][A-Za-z0-9&. -]{2,50})\s+(?:recruiting|staffing|search|talent)/i,
    /@\s*([A-Z][A-Za-z0-9&. -]{2,50})(?:\s|\||,|\.|$)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const company = cleanCompany(match[1]);
      if (normalize(company) !== normalize(employerCompanyName)) return company;
    }
  }
  return null;
}

function findCompany(text: string) {
  const match = text.match(/(?:at|from|with)\s+([A-Z][A-Za-z0-9&. -]{2,40})(?:\s|,|\.|$)/);
  return match?.[1] ? cleanCompany(match[1]) : null;
}

function findRole(text: string) {
  const explicit = text.match(/((?:Senior|Staff|Principal|Lead|Full[- ]Stack|Backend|Frontend|Platform|Software|Data|DevOps|ML|AI)[A-Za-z -]*(?:Engineer|Developer|Architect|Manager|Designer))/i);
  if (explicit) return titleCase(explicit[1]);
  const role = text.match(/role[:\s]+([A-Za-z0-9 -]{4,60})/i);
  return role?.[1]?.trim() || null;
}

function findContactName(text: string) {
  const linkedInHeader = text.match(/^([A-Z][a-z]+(?:\s+[A-Z]\.|\s+[A-Z][a-z]+)?)/);
  if (linkedInHeader?.[1] && !/^(Hi|Hello|Thanks|Best|Regards)$/i.test(linkedInHeader[1])) return linkedInHeader[1];
  const signoff = text.match(/(?:thanks|best|regards|cheers),?\s*\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  return signoff?.[1] ?? null;
}

function fallbackCompanyName() {
  return `Unknown Company - ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date())} Import`;
}

function fallbackClientName(recruiterCompanyName: string) {
  return `Unknown Client - ${recruiterCompanyName} Import`;
}

function inferRemoteMode(text: string) {
  if (/remote/i.test(text)) return "REMOTE";
  if (/hybrid/i.test(text)) return "HYBRID";
  if (/onsite|on-site/i.test(text)) return "ONSITE";
  return "UNKNOWN";
}

function inferFollowUpTitle(text: string) {
  if (/availability|available/i.test(text)) return "Send availability";
  if (/thank/i.test(text)) return "Send thank-you note";
  return "Follow up from import";
}

function sourceLabel(sourceType: AnalyzeImportInput["sourceType"]) {
  return sourceType.replaceAll("_", " ");
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanCompany(value: string) {
  return value
    .split(/[.!?\n]/)[0]
    .trim()
    .replace(/\s+(team|role|position|opportunity|client)$/i, "");
}

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
