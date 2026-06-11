import { describe, expect, it } from "vitest";
import { enhanceImportAnalysis } from "./imports.enhance.js";

describe("enhanceImportAnalysis", () => {
  it("preserves interview notes and infers an end-of-week follow-up", () => {
    const rawText = "done with interview with Milan. Job is remote, 110 to 150k base salary. Will hear back by EOW. today is 6/10/2026";
    const result = enhanceImportAnalysis(
      { sourceType: "interview_notes", rawText },
      {
        summary: "Interview notes",
        proposals: [
          {
            id: "interview-1",
            entityType: "INTERVIEW",
            operation: "CREATE",
            included: true,
            confidence: 0.8,
            matchReason: null,
            existingEntityId: null,
            proposedFields: { roundName: "Interview with Milan", scheduledAt: null, applicationProposalId: null },
            missingFields: ["scheduledAt"],
            warnings: []
          },
          {
            id: "contact-1",
            entityType: "CONTACT",
            operation: "CREATE",
            included: true,
            confidence: 0.7,
            matchReason: null,
            existingEntityId: null,
            proposedFields: { name: "Milan" },
            missingFields: [],
            warnings: []
          }
        ]
      }
    );

    const interview = result.proposals.find((proposal) => proposal.id === "interview-1");
    const contact = result.proposals.find((proposal) => proposal.id === "contact-1");
    const note = result.proposals.find((proposal) => proposal.entityType === "INTERVIEW_NOTE");
    const followUp = result.proposals.find((proposal) => proposal.entityType === "FOLLOW_UP");

    expect(interview?.included).toBe(false);
    expect(contact?.included).toBe(false);
    expect(note?.included).toBe(false);
    expect(note?.proposedFields.body).toBe(rawText);
    expect(followUp?.included).toBe(true);
    expect(followUp?.proposedFields.title).toBe("Follow up on interview outcome");
    expect(followUp?.proposedFields.dueAt).toBe("2026-06-12T22:00:00.000Z");
  });

  it("uses selected interview context for interview notes", () => {
    const rawText = "done with interview with Milan. Job is remote, 110 to 150k base salary. Will hear back by EOW. today is 6/10/2026";
    const result = enhanceImportAnalysis(
      {
        sourceType: "interview_notes",
        rawText,
        contextInterviewId: "interview-1",
        context: {
          application: { id: "app-1", roleTitle: "Senior Engineer", companyName: "Northstar Systems" },
          interview: { id: "interview-1", roundName: "Milan Screen", scheduledAt: "2026-06-10T15:00:00.000Z", applicationId: "app-1" }
        }
      },
      {
        summary: "Interview notes",
        proposals: [
          {
            id: "interview-proposal",
            entityType: "INTERVIEW",
            operation: "CREATE",
            included: false,
            confidence: 0.8,
            matchReason: null,
            existingEntityId: null,
            proposedFields: { roundName: "Interview with Milan" },
            missingFields: ["applicationProposalId", "scheduledAt"],
            warnings: []
          },
          {
            id: "app-proposal",
            entityType: "APPLICATION",
            operation: "CREATE",
            included: true,
            confidence: 0.8,
            matchReason: null,
            existingEntityId: null,
            proposedFields: { remoteMode: "REMOTE", compensationMin: 110000, compensationMax: 150000, nextAction: "Wait to hear back by EOW" },
            missingFields: ["companyProposalId", "roleTitle"],
            warnings: []
          }
        ]
      }
    );

    const interview = result.proposals.find((proposal) => proposal.id === "interview-proposal");
    const application = result.proposals.find((proposal) => proposal.id === "app-proposal");
    const note = result.proposals.find((proposal) => proposal.entityType === "INTERVIEW_NOTE");
    const followUp = result.proposals.find((proposal) => proposal.entityType === "FOLLOW_UP");

    expect(interview?.operation).toBe("UPDATE");
    expect(interview?.included).toBe(true);
    expect(interview?.existingEntityId).toBe("interview-1");
    expect(interview?.proposedFields.rawPostInterviewNotes).toBe(rawText);
    expect(interview?.proposedFields.outcome).toBe("COMPLETED");
    expect(application?.operation).toBe("UPDATE");
    expect(application?.existingEntityId).toBe("app-1");
    expect(note?.included).toBe(true);
    expect(note?.proposedFields.interviewId).toBe("interview-1");
    expect(followUp?.proposedFields.applicationId).toBe("app-1");
    expect(followUp?.proposedFields.interviewId).toBe("interview-1");
  });
});
