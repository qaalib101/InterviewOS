import { describe, expect, it } from "vitest";
import { applicationInputSchema, companyInputSchema, contactInputSchema } from "./crm.js";

describe("CRM schemas", () => {
  it("validates company input", () => {
    const result = companyInputSchema.safeParse({
      name: "Northstar Systems",
      website: "https://northstar.example"
    });

    expect(result.success).toBe(true);
  });

  it("validates an imported in-progress application", () => {
    const result = applicationInputSchema.safeParse({
      companyId: "company-1",
      roleTitle: "Senior Engineer",
      stage: "TECH_SCREEN",
      remoteMode: "REMOTE",
      priority: "HIGH",
      confidence: 4,
      compensationMin: 140000,
      compensationMax: 170000
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid application confidence", () => {
    const result = applicationInputSchema.safeParse({
      companyId: "company-1",
      roleTitle: "Senior Engineer",
      stage: "APPLIED",
      remoteMode: "REMOTE",
      priority: "HIGH",
      confidence: 9
    });

    expect(result.success).toBe(false);
  });

  it("validates contact input", () => {
    const result = contactInputSchema.safeParse({
      name: "Jamie Carter",
      companyId: "company-1",
      applicationId: "application-1",
      email: "jamie@example.com"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid contact email", () => {
    const result = contactInputSchema.safeParse({
      name: "Jamie Carter",
      email: "not-an-email"
    });

    expect(result.success).toBe(false);
  });
});
