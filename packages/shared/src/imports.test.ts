import { describe, expect, it } from "vitest";
import { analyzeImportInputSchema, importAnalysisResultSchema } from "./imports.js";

describe("import schemas", () => {
  it("validates analyze input", () => {
    const input = analyzeImportInputSchema.parse({ sourceType: "recruiter_email", rawText: "Hello" });
    expect(input.sourceType).toBe("recruiter_email");
  });

  it("validates reviewable proposals", () => {
    const result = importAnalysisResultSchema.parse({
      proposals: [{
        id: "proposal-1",
        entityType: "COMPANY",
        operation: "CREATE",
        included: true,
        confidence: 0.8,
        proposedFields: { name: "Northstar Systems" },
        missingFields: [],
        warnings: []
      }]
    });
    expect(result.proposals[0].entityType).toBe("COMPANY");
  });
});
