import { describe, expect, it } from "vitest";
import { MockAiProvider } from "./mockAiProvider.js";

describe("MockAiProvider", () => {
  it("is available and returns reviewable proposals", async () => {
    const provider = new MockAiProvider();
    const result = await provider.analyzeImport({ sourceType: "recruiter_email", rawText: "Senior Backend Engineer at Northstar Systems. Reply with availability." });

    expect(provider.status().available).toBe(true);
    expect(result.proposals.length).toBeGreaterThan(1);
    expect(result.proposals[0]).toHaveProperty("included");
  });

  it("separates recruiter company from employer company", async () => {
    const provider = new MockAiProvider();
    const result = await provider.analyzeImport({
      sourceType: "recruiter_email",
      rawText: "Hi Qaalib, I am a recruiter at Apex Search. I am recruiting for a Staff Backend Engineer role at Northstar Systems. Reply with availability. Thanks, Jamie"
    });

    const employer = result.proposals.find((proposal) => proposal.id === "company-1");
    const recruiterCompany = result.proposals.find((proposal) => proposal.id === "recruiter-company-1");
    const contact = result.proposals.find((proposal) => proposal.id === "contact-1");
    const application = result.proposals.find((proposal) => proposal.id === "application-1");

    expect(employer?.proposedFields.name).toBe("Northstar Systems");
    expect(application?.proposedFields.companyProposalId).toBe("company-1");
    expect(recruiterCompany?.proposedFields.name).toBe("Apex Search");
    expect(contact?.proposedFields.companyProposalId).toBe("recruiter-company-1");
    expect(contact?.proposedFields.applicationProposalId).toBe("application-1");
  });

  it("uses an unknown client placeholder when only the recruiter company is known", async () => {
    const provider = new MockAiProvider();
    const result = await provider.analyzeImport({
      sourceType: "linkedin_message",
      rawText: "Deva K. Delivery Manager @Akkodis. One of our clients is hiring a Senior Full Stack Engineer. Can you work W2 and hybrid?"
    });

    const employer = result.proposals.find((proposal) => proposal.id === "company-1");
    const recruiterCompany = result.proposals.find((proposal) => proposal.id === "recruiter-company-1");
    const contact = result.proposals.find((proposal) => proposal.id === "contact-1");
    const application = result.proposals.find((proposal) => proposal.id === "application-1");

    expect(employer?.proposedFields.name).toBe("Unknown Client - Akkodis Import");
    expect(recruiterCompany?.proposedFields.name).toBe("Akkodis");
    expect(application?.proposedFields.companyProposalId).toBe("company-1");
    expect(contact?.proposedFields.companyProposalId).toBe("recruiter-company-1");
    expect(contact?.proposedFields.applicationProposalId).toBe("application-1");
  });

});
