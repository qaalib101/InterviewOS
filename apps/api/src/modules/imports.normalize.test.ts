import { describe, expect, it } from "vitest";
import { normalizeImportAnalysis } from "./imports.normalize.js";

describe("normalizeImportAnalysis", () => {
  it("removes stale missing required fields when proposed fields are present", () => {
    const result = normalizeImportAnalysis({
      summary: "Interview invitation",
      proposals: [
        {
          id: "p1",
          entityType: "INTERVIEW",
          operation: "CREATE",
          included: true,
          confidence: 0.9,
          proposedFields: {
            applicationId: "application-1",
            roundName: "Interview",
            scheduledAt: "2026-06-17T18:00:00Z"
          },
          missingFields: ["roundName", "scheduledAt", "applicationProposalId"],
          warnings: ["Round name inferred as 'Interview' based on invitation."]
        }
      ]
    });

    expect(result.proposals[0]).toMatchObject({ included: true, missingFields: [] });
    expect(result.proposals[0].warnings).not.toContain("Proposal was excluded because required fields are missing. Review and complete the fields before committing.");
  });
});
