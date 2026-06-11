import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

vi.mock("../db/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: { upsert: vi.fn() },
    importSession: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    activityEvent: { findMany: vi.fn(), create: vi.fn() },
    company: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    application: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    contact: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    interview: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    interviewNote: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    followUp: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), groupBy: vi.fn() }
  }
}));

describe("import routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: "user-1" } as any);
    vi.mocked(prisma.company.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.contact.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.application.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.importSession.create).mockResolvedValue({ id: "import-1", status: "DRAFT" } as any);
    vi.mocked(prisma.importSession.update).mockImplementation((async (args: any) => ({ id: args.where.id, ...args.data }) as any) as any);
  });

  it("returns AI provider status", async () => {
    const response = await request(createApp()).get("/api/v1/ai/status");

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(true);
    expect(response.body.provider).toBe("mock");
  });

  it("analyzes raw text into an import session preview", async () => {
    const response = await request(createApp()).post("/api/v1/imports/analyze").send({
      sourceType: "recruiter_email",
      rawText: "Hi, I am recruiting for a Senior Backend Engineer role at Northstar Systems. Reply with availability. Thanks, Jamie"
    });

    expect(response.status).toBe(201);
    expect(prisma.importSession.create).toHaveBeenCalled();
    expect(prisma.importSession.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ANALYZED" }) }));
    expect(response.body.analysis.proposals.some((proposal: any) => proposal.entityType === "APPLICATION")).toBe(true);
  });

  it("updates edited proposals without committing records", async () => {
    vi.mocked(prisma.importSession.findFirst).mockResolvedValue({ id: "import-1", status: "ANALYZED" } as any);
    const analysis = { summary: "Edited", proposals: [] };

    const response = await request(createApp()).patch("/api/v1/imports/import-1/proposals").send({ analysis });

    expect(response.status).toBe(200);
    expect(prisma.importSession.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ analysisJson: analysis }) }));
  });

  it("commits included proposals transactionally", async () => {
    const analysis = {
      summary: "Commit",
      proposals: [
        {
          id: "company-1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 0.9,
          proposedFields: { name: "Northstar Systems" },
          missingFields: [],
          warnings: []
        }
      ]
    };
    vi.mocked(prisma.importSession.findFirst).mockResolvedValue({ id: "import-1", status: "ANALYZED", analysisJson: analysis } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "company-1", name: "Northstar Systems" } as any);
    vi.mocked(prisma.activityEvent.create).mockResolvedValue({ id: "event-1" } as any);

    const response = await request(createApp()).post("/api/v1/imports/import-1/commit").send({ analysis });

    expect(response.status).toBe(200);
    expect(response.body.records[0].id).toBe("company-1");
    expect(prisma.$transaction).toHaveBeenCalled();
  });
  it("patches update proposals without requiring create-only fields", async () => {
    const analysis = {
      summary: "Update",
      proposals: [
        {
          id: "application-1",
          entityType: "APPLICATION",
          operation: "UPDATE",
          included: true,
          existingEntityId: "app-1",
          confidence: 0.9,
          proposedFields: { nextAction: "Send availability" },
          missingFields: [],
          warnings: []
        }
      ]
    };
    vi.mocked(prisma.importSession.findFirst).mockResolvedValue({ id: "import-1", status: "ANALYZED", analysisJson: analysis } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
    vi.mocked(prisma.application.update).mockResolvedValue({ id: "app-1", roleTitle: "Senior Engineer" } as any);
    vi.mocked(prisma.activityEvent.create).mockResolvedValue({ id: "event-1" } as any);

    const response = await request(createApp()).post("/api/v1/imports/import-1/commit").send({ analysis });

    expect(response.status).toBe(200);
    expect(prisma.application.update).toHaveBeenCalledWith({ where: { id: "app-1" }, data: { nextAction: "Send availability" } });
  });

  it("normalizes lowercase application enums before updating", async () => {
    const analysis = {
      summary: "Update enums",
      proposals: [
        {
          id: "company-1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 0.9,
          proposedFields: { name: "Unknown Client - Akkodis Import" },
          missingFields: [],
          warnings: []
        },
        {
          id: "application-1",
          entityType: "APPLICATION",
          operation: "UPDATE",
          included: true,
          existingEntityId: "app-1",
          confidence: 0.9,
          proposedFields: {
            companyProposalId: "company-1",
            roleTitle: "Senior Full Stack Engineer",
            source: "linkedin_message",
            stage: "applied",
            remoteMode: "hybrid",
            priority: "medium",
            compensationMin: "110k",
            compensationMax: "150k",
            nextAction: "Send resume and schedule a chat with Deva."
          },
          missingFields: [],
          warnings: []
        }
      ]
    };
    vi.mocked(prisma.importSession.findFirst).mockResolvedValue({ id: "import-1", status: "ANALYZED", analysisJson: analysis } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "company-1", name: "Unknown Client - Akkodis Import" } as any);
    vi.mocked(prisma.application.update).mockResolvedValue({ id: "app-1", roleTitle: "Senior Full Stack Engineer" } as any);
    vi.mocked(prisma.activityEvent.create).mockResolvedValue({ id: "event-1" } as any);

    const response = await request(createApp()).post("/api/v1/imports/import-1/commit").send({ analysis });

    expect(response.status).toBe(200);
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: expect.objectContaining({
        companyId: "company-1",
        stage: "APPLIED",
        remoteMode: "HYBRID",
        priority: "MEDIUM",
        compensationMin: 110000,
        compensationMax: 150000
      })
    });
  });

  it("normalizes malformed provider warnings instead of failing analysis", async () => {
    const analysis = {
      summary: "Provider output",
      proposals: [
        {
          id: "company-1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 0.7,
          proposedFields: { name: "Northstar Systems" },
          missingFields: [],
          warnings: [{ message: "Confirm company" }]
        }
      ]
    };
    vi.mocked(prisma.importSession.findFirst).mockResolvedValue({ id: "import-1", status: "ANALYZED", analysisJson: analysis } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "company-1", name: "Northstar Systems" } as any);
    vi.mocked(prisma.activityEvent.create).mockResolvedValue({ id: "event-1" } as any);

    const response = await request(createApp()).post("/api/v1/imports/import-1/commit").send({ analysis });

    expect(response.status).toBe(200);
    expect(prisma.company.create).toHaveBeenCalled();
  });

  it("normalizes common provider field aliases before commit", async () => {
    const analysis = {
      summary: "Alias fields",
      proposals: [
        {
          id: "company-1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 0.9,
          proposedFields: { name: "Unknown Client - Akkodis Import" },
          missingFields: [],
          warnings: []
        },
        {
          id: "application-1",
          entityType: "APPLICATION",
          operation: "CREATE",
          included: true,
          confidence: 0.8,
          proposedFields: { companyProposalId: "company-1", title: "Senior Full Stack Engineer" },
          missingFields: [],
          warnings: []
        },
        {
          id: "contact-1",
          entityType: "CONTACT",
          operation: "CREATE",
          included: true,
          confidence: 0.8,
          proposedFields: { applicationProposalId: "application-1", name: "Deva K.", title: "Delivery Manager" },
          missingFields: [],
          warnings: []
        }
      ]
    };
    vi.mocked(prisma.importSession.findFirst).mockResolvedValue({ id: "import-1", status: "ANALYZED", analysisJson: analysis } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "company-1", name: "Unknown Client - Akkodis Import" } as any);
    vi.mocked(prisma.application.create).mockResolvedValue({ id: "application-1", roleTitle: "Senior Full Stack Engineer" } as any);
    vi.mocked(prisma.contact.create).mockResolvedValue({ id: "contact-1", name: "Deva K." } as any);
    vi.mocked(prisma.activityEvent.create).mockResolvedValue({ id: "event-1" } as any);

    const response = await request(createApp()).post("/api/v1/imports/import-1/commit").send({ analysis });

    expect(response.status).toBe(200);
    expect(prisma.application.create).toHaveBeenCalledWith({ data: expect.objectContaining({ roleTitle: "Senior Full Stack Engineer" }) });
    expect(prisma.contact.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "Delivery Manager", applicationId: "application-1" }) });
  });

  it("normalizes DeepSeek-style proposals into commit-safe fields", async () => {
    const analysis = {
      summary: "DeepSeek provider output",
      proposals: [
        {
          id: "1",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 1,
          proposedFields: { name: "Akkodis", website: null },
          missingFields: [],
          warnings: []
        },
        {
          id: "2",
          entityType: "COMPANY",
          operation: "CREATE",
          included: true,
          confidence: 0.6,
          proposedFields: { name: "Unknown Client - Akkodis Import" },
          missingFields: ["name"],
          warnings: []
        },
        {
          id: "3",
          entityType: "CONTACT",
          operation: "CREATE",
          included: true,
          confidence: 1,
          proposedFields: {
            firstName: "Deva",
            lastName: "K.",
            role: "Delivery Manager",
            email: null,
            phone: null,
            companyId: "1"
          },
          missingFields: ["email", "phone"],
          warnings: []
        },
        {
          id: "4",
          entityType: "APPLICATION",
          operation: "CREATE",
          included: true,
          confidence: 1,
          proposedFields: {
            roleTitle: "Senior Full Stack Engineer",
            companyId: "2"
          },
          missingFields: [],
          warnings: []
        },
        {
          id: "5",
          entityType: "INTERVIEW",
          operation: "CREATE",
          included: true,
          confidence: 0.5,
          proposedFields: {
            applicationProposalId: "4",
            status: "pending",
            stage: "Initial discussion",
            date: null,
            time: null
          },
          missingFields: ["date", "time"],
          warnings: []
        },
        {
          id: "6",
          entityType: "INTERVIEW_NOTE",
          operation: "CREATE",
          included: true,
          confidence: 0.7,
          proposedFields: {
            interviewProposalId: "5",
            content: "Qaalib confirmed W2 and hybrid availability."
          },
          missingFields: [],
          warnings: []
        },
        {
          id: "7",
          entityType: "FOLLOW_UP",
          operation: "CREATE",
          included: true,
          confidence: 0.6,
          proposedFields: {
            applicationProposalId: "4",
            action: "Send availability for chat",
            dueDate: null,
            status: "pending"
          },
          missingFields: ["dueDate"],
          warnings: []
        }
      ]
    };
    vi.mocked(prisma.importSession.findFirst).mockResolvedValue({ id: "import-1", status: "ANALYZED", analysisJson: analysis } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
    vi.mocked(prisma.company.create)
      .mockResolvedValueOnce({ id: "company-1", name: "Akkodis" } as any)
      .mockResolvedValueOnce({ id: "company-2", name: "Unknown Client - Akkodis Import" } as any);
    vi.mocked(prisma.application.create).mockResolvedValue({ id: "application-1", roleTitle: "Senior Full Stack Engineer" } as any);
    vi.mocked(prisma.contact.create).mockResolvedValue({ id: "contact-1", name: "Deva K." } as any);
    vi.mocked(prisma.activityEvent.create).mockResolvedValue({ id: "event-1" } as any);

    const response = await request(createApp()).post("/api/v1/imports/import-1/commit").send({ analysis });

    expect(response.status).toBe(200);
    expect(response.body.records).toHaveLength(4);
    expect(prisma.application.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-2", roleTitle: "Senior Full Stack Engineer" }) });
    expect(prisma.contact.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-1", name: "Deva K." }) });
    expect(prisma.interview.create).not.toHaveBeenCalled();
    expect(prisma.interviewNote.create).not.toHaveBeenCalled();
    expect(prisma.followUp.create).not.toHaveBeenCalled();
  });

});
