import { describe, expect, it, vi } from "vitest";
import { applyLocalMatches } from "./imports.matching.js";

describe("applyLocalMatches", () => {
  it("links an interview invitation to the existing active application when the role title is missing", async () => {
    const db = {
      company: {
        findMany: vi.fn().mockResolvedValue([{ id: "company-1", userId: "user-1", name: "Reddit", website: null }]),
        findFirst: vi.fn().mockResolvedValue({ id: "company-1", userId: "user-1", name: "Reddit", website: null })
      },
      contact: {
        findFirst: vi.fn().mockResolvedValue({ id: "contact-1", userId: "user-1", companyId: "company-1", applicationId: "application-1", name: "Leah Busse-Geagan", role: "Recruiter", email: null }),
        findMany: vi.fn().mockResolvedValue([{ id: "contact-1", userId: "user-1", name: "Leah Busse-Geagan", email: null }])
      },
      application: {
        findFirst: vi.fn().mockResolvedValue({
          id: "application-1",
          userId: "user-1",
          companyId: "company-1",
          roleTitle: "Senior Software Engineer",
          stage: "RECRUITER_SCREEN"
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "application-1",
            userId: "user-1",
            companyId: "company-1",
            roleTitle: "Senior Software Engineer",
            stage: "RECRUITER_SCREEN",
            company: { id: "company-1", name: "Reddit" }
          }
        ])
      },
      interview: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };

    const result = await applyLocalMatches(db as any, "user-1", {
      summary: "Interview invitation from Reddit.",
      proposals: [
        {
          id: "prop_1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 1,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { name: "Reddit" },
          missingFields: [],
          warnings: []
        },
        {
          id: "prop_2",
          entityType: "APPLICATION",
          operation: "CREATE",
          included: false,
          confidence: 0.9,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { companyProposalId: "prop_1", roleTitle: "Unknown" },
          missingFields: ["roleTitle"],
          warnings: []
        },
        {
          id: "prop_3",
          entityType: "CONTACT",
          operation: "CREATE",
          included: false,
          confidence: 1,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { companyProposalId: "prop_1", applicationProposalId: "prop_2", name: "Leah Busse-Geagan", role: "Recruiter" },
          missingFields: [],
          warnings: ["Proposal was excluded because it references another excluded proposal."]
        },
        {
          id: "prop_4",
          entityType: "INTERVIEW",
          operation: "CREATE",
          included: false,
          confidence: 1,
          matchReason: null,
          existingEntityId: null,
          proposedFields: {
            applicationProposalId: "prop_2",
            roundName: "Recruiter Phone Screen",
            roundNumber: 1,
            type: "RECRUITER",
            format: "VIDEO",
            scheduledAt: "2026-06-16T12:00:00-06:00",
            durationMinutes: 30,
            interviewers: ["Leah Busse-Geagan"],
            outcome: "SCHEDULED"
          },
          missingFields: [],
          warnings: ["Proposal was excluded because it references another excluded proposal."]
        }
      ]
    });

    const company = result.proposals.find((proposal) => proposal.id === "prop_1");
    const application = result.proposals.find((proposal) => proposal.id === "prop_2");
    const contact = result.proposals.find((proposal) => proposal.id === "prop_3");
    const interview = result.proposals.find((proposal) => proposal.id === "prop_4");

    expect(company).toMatchObject({ operation: "SKIP", included: false, existingEntityId: "company-1", proposedFields: {} });
    expect(application).toMatchObject({ operation: "SKIP", included: false, existingEntityId: "application-1", proposedFields: {} });
    expect(application?.proposedFields.roleTitle).toBeUndefined();
    expect(application?.matchReason).toContain("role title");
    expect(contact).toMatchObject({ operation: "SKIP", included: false, existingEntityId: "contact-1", proposedFields: {} });
    expect(contact?.warnings).not.toContain("Proposal was excluded because it references another excluded proposal.");
    expect(interview).toMatchObject({ operation: "CREATE", included: true, proposedFields: { applicationId: "application-1" } });
    expect(interview?.proposedFields.applicationProposalId).toBeUndefined();
    expect(interview?.warnings).not.toContain("Proposal was excluded because it references another excluded proposal.");
  });

  it("skips a matched interview when the import does not add new fields", async () => {
    const scheduledAt = "2026-06-16T18:00:00.000Z";
    const db = {
      company: {
        findMany: vi.fn().mockResolvedValue([{ id: "company-1", userId: "user-1", name: "Reddit", website: null }]),
        findFirst: vi.fn().mockResolvedValue({ id: "company-1", userId: "user-1", name: "Reddit", website: null })
      },
      contact: {
        findMany: vi.fn().mockResolvedValue([])
      },
      application: {
        findFirst: vi.fn().mockResolvedValue({ id: "application-1", userId: "user-1", companyId: "company-1", roleTitle: "Senior Software Engineer", stage: "RECRUITER_SCREEN" }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "application-1",
            userId: "user-1",
            companyId: "company-1",
            roleTitle: "Senior Software Engineer",
            stage: "RECRUITER_SCREEN",
            company: { id: "company-1", name: "Reddit" }
          }
        ])
      },
      interview: {
        findFirst: vi.fn().mockResolvedValue({
          id: "interview-1",
          userId: "user-1",
          applicationId: "application-1",
          roundName: "Recruiter Phone Screen",
          roundNumber: 1,
          type: "RECRUITER",
          format: "VIDEO",
          scheduledAt: new Date(scheduledAt),
          durationMinutes: 30,
          interviewers: ["Leah Busse-Geagan"],
          outcome: "SCHEDULED"
        })
      }
    };

    const result = await applyLocalMatches(db as any, "user-1", {
      summary: "Duplicate interview invitation from Reddit.",
      proposals: [
        {
          id: "company-1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 1,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { name: "Reddit" },
          missingFields: [],
          warnings: []
        },
        {
          id: "application-1",
          entityType: "APPLICATION",
          operation: "CREATE",
          included: true,
          confidence: 0.8,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { companyProposalId: "company-1", roleTitle: "Unknown" },
          missingFields: [],
          warnings: []
        },
        {
          id: "interview-1",
          entityType: "INTERVIEW",
          operation: "CREATE",
          included: true,
          confidence: 1,
          matchReason: null,
          existingEntityId: null,
          proposedFields: {
            applicationProposalId: "application-1",
            roundName: "Recruiter Phone Screen",
            roundNumber: 1,
            type: "RECRUITER",
            format: "VIDEO",
            scheduledAt,
            durationMinutes: 30,
            interviewers: ["Leah Busse-Geagan"],
            outcome: "SCHEDULED"
          },
          missingFields: [],
          warnings: []
        }
      ]
    });

    expect(result.proposals.every((proposal) => proposal.operation === "SKIP" && !proposal.included)).toBe(true);
    expect(result.proposals.find((proposal) => proposal.id === "interview-1")).toMatchObject({ existingEntityId: "interview-1", proposedFields: {} });
  });

  it("treats notes-only updates on matched context entities as no-op context", async () => {
    const db = {
      company: {
        findMany: vi.fn().mockResolvedValue([{ id: "company-1", userId: "user-1", name: "Reddit", website: null }]),
        findFirst: vi.fn().mockResolvedValue({ id: "company-1", userId: "user-1", name: "Reddit", notes: null })
      },
      contact: {
        findMany: vi.fn().mockResolvedValue([])
      },
      application: {
        findFirst: vi.fn().mockResolvedValue({ id: "application-1", userId: "user-1", companyId: "company-1", roleTitle: "Senior Software Engineer", notes: null }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "application-1",
            userId: "user-1",
            companyId: "company-1",
            roleTitle: "Senior Software Engineer",
            stage: "RECRUITER_SCREEN",
            company: { id: "company-1", name: "Reddit" }
          }
        ])
      },
      interview: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };

    const result = await applyLocalMatches(db as any, "user-1", {
      summary: "Recruiter phone screen scheduled with Leah at Reddit.",
      proposals: [
        {
          id: "company-1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 1,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { name: "Reddit", notes: "Employer company from interview invite" },
          missingFields: [],
          warnings: []
        },
        {
          id: "application-1",
          entityType: "APPLICATION",
          operation: "CREATE",
          included: true,
          confidence: 0.8,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { companyProposalId: "company-1", roleTitle: "Unknown", notes: "Interview invite does not specify role title" },
          missingFields: [],
          warnings: []
        }
      ]
    });

    expect(result.proposals).toEqual([
      expect.objectContaining({ id: "company-1", operation: "SKIP", included: false, proposedFields: {} }),
      expect.objectContaining({ id: "application-1", operation: "SKIP", included: false, proposedFields: {} })
    ]);
  });

  it("updates a compatible existing application and creates an interview for an invite", async () => {
    const db = {
      company: {
        findMany: vi.fn().mockResolvedValue([{ id: "company-1", userId: "user-1", name: "Orum", website: null }]),
        findFirst: vi.fn().mockResolvedValue({ id: "company-1", userId: "user-1", name: "Orum", website: null })
      },
      contact: {
        findMany: vi.fn().mockResolvedValue([])
      },
      application: {
        findFirst: vi.fn().mockResolvedValue({
          id: "application-1",
          userId: "user-1",
          companyId: "company-1",
          roleTitle: "Senior Software Engineer",
          stage: "APPLIED"
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "application-1",
            userId: "user-1",
            companyId: "company-1",
            roleTitle: "Senior Software Engineer",
            stage: "APPLIED",
            company: { id: "company-1", name: "Orum" }
          }
        ])
      },
      interview: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };

    const result = await applyLocalMatches(db as any, "user-1", {
      summary: "Interview invitation for Senior Software Engineer at Orum on June 17, 2026.",
      proposals: [
        {
          id: "p1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 0.9,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { name: "Orum" },
          missingFields: [],
          warnings: []
        },
        {
          id: "p2",
          entityType: "APPLICATION",
          operation: "CREATE",
          included: true,
          confidence: 0.9,
          matchReason: null,
          existingEntityId: null,
          proposedFields: { companyProposalId: "p1", roleTitle: "Senior Software Engineer - Product" },
          missingFields: [],
          warnings: []
        },
        {
          id: "p3",
          entityType: "INTERVIEW",
          operation: "CREATE",
          included: true,
          confidence: 0.9,
          matchReason: null,
          existingEntityId: null,
          proposedFields: {
            applicationProposalId: "p2",
            roundName: "Interview",
            roundNumber: 1,
            format: "VIDEO",
            scheduledAt: "2026-06-17T18:00:00Z"
          },
          missingFields: [],
          warnings: []
        }
      ]
    });

    expect(result.proposals.find((proposal) => proposal.id === "p1")).toMatchObject({ operation: "SKIP", included: false, existingEntityId: "company-1" });
    expect(result.proposals.find((proposal) => proposal.id === "p2")).toMatchObject({
      operation: "UPDATE",
      included: true,
      existingEntityId: "application-1",
      proposedFields: { roleTitle: "Senior Software Engineer - Product" }
    });
    expect(result.proposals.find((proposal) => proposal.id === "p3")).toMatchObject({
      operation: "CREATE",
      included: true,
      proposedFields: { applicationId: "application-1" },
      missingFields: []
    });
    expect(db.interview.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        applicationId: "application-1",
        scheduledAt: new Date("2026-06-17T18:00:00Z")
      }
    });
  });
});
