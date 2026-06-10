import type { AnalyzeImportInput } from "@interview-os/shared";
import { env } from "../../config/env.js";

export function buildImportPrompt(input: AnalyzeImportInput) {
  const userAliases = env.aiUserAliases.length ? env.aiUserAliases.join(", ") : env.localUserName;

  return `Extract structured import proposals from this text. Return JSON only with shape {"summary":"string","proposals":[{"id":"string","entityType":"COMPANY|APPLICATION|CONTACT|INTERVIEW|INTERVIEW_NOTE|FOLLOW_UP","operation":"CREATE|UPDATE|SKIP","included":boolean,"confidence":0-1,"matchReason":null,"existingEntityId":null,"proposedFields":{},"missingFields":[],"warnings":[]}]}. Use defaults only when needed. Do not invent compensation, dates, or outcomes.

Backend field contract:
- Company proposedFields: name, website, industry, location, notes.
- Application proposedFields: companyProposalId or companyId, roleTitle, jobUrl, source, stage, remoteMode, priority, concerns, nextAction, nextActionAt, notes.
- Contact proposedFields: companyProposalId or companyId, applicationProposalId or applicationId, name, role, email, phone, linkedinUrl, notes.
- Interview proposedFields: applicationProposalId or applicationId, roundName, roundNumber, type, format, scheduledAt, durationMinutes, interviewers, expectedTopics, prepNotes, rawPostInterviewNotes, outcome.
- InterviewNote proposedFields: interviewProposalId or interviewId, type, body.
- FollowUp proposedFields: applicationProposalId or applicationId, contactProposalId or contactId, interviewProposalId or interviewId, title, dueAt, priority, type, notes.
- When referencing another proposal from the same response, use the *ProposalId field, not companyId/applicationId/contactId/interviewId.
- Do not output firstName, lastName, title for application role, action, content, date, time, dueDate, status, or stage for interviews.
- Enum values must be uppercase exactly as listed: Application.stage SAVED|APPLIED|RECRUITER_SCREEN|TECH_SCREEN|ONSITE|OFFER|REJECTED|WITHDRAWN|ARCHIVED; remoteMode REMOTE|HYBRID|ONSITE|UNKNOWN; priority LOW|MEDIUM|HIGH; Interview.type BEHAVIORAL|TECHNICAL|SYSTEM_DESIGN|HIRING_MANAGER|RECRUITER|PANEL|OTHER; Interview.format PHONE|VIDEO|ONSITE|TAKE_HOME|OTHER; Interview.outcome SCHEDULED|COMPLETED|PASSED|FAILED|CANCELLED|UNKNOWN; InterviewNote.type PREP|RAW_POST_INTERVIEW|STRUCTURED_ANALYSIS|FEEDBACK|FOLLOW_UP_DRAFT; FollowUp.type EMAIL|LINKEDIN|THANK_YOU|CHECK_IN|PREP_TASK|OTHER.
- If a create proposal is missing a required backend field, set included=false and add the field to missingFields.
- Required create fields: Company.name, Application.companyProposalId/companyId and roleTitle, Contact.name, Interview.applicationProposalId/applicationId and roundName and scheduledAt, InterviewNote.interviewProposalId/interviewId and body, FollowUp.title and dueAt.

User context:
- The person using Interview OS is ${env.localUserName}.
- Treat these names as the user, not as recruiters, interviewers, contacts, or companies: ${userAliases}.
- If the pasted text says "I", "me", "my", or references ${env.localUserName}, interpret that as the user unless the text clearly says otherwise.
- Do not create Contact proposals for the user.

Recruiter company vs employer company:
- If the text mentions a recruiting agency, staffing firm, search firm, or recruiter employer separately from the company where the role is located, model them as two different Company proposals.
- The Application.companyId must point to the employer/client/company where the role will work, not the recruiter agency.
- The Contact.companyId should point to the recruiter agency if the recruiter works there.
- Link the recruiter Contact to the Application with applicationProposalId or applicationId.
- Add a warning when recruiter company vs employer company is inferred.
- If the recruiter company is known but the actual employer/client is not named, create a separate placeholder employer Company proposal named "Unknown Client - [Recruiter Company] Import" and point the Application to that placeholder.
- Do not use a recruiting agency as Application.companyId unless the role is clearly internal to that recruiting agency.
- Contacts may have companyId null when their employer is unclear, but should still be linked to the Application when the text connects them to the process.
- Use roleTitle for application titles and role for contact titles.

Source type: ${input.sourceType}.
Text:\n${input.rawText}`;
}

export function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI provider did not return JSON.");
  return JSON.parse(match[0]);
}
