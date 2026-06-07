import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

vi.mock("../db/prisma.js", () => ({
  prisma: {
    user: { upsert: vi.fn() },
    company: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    application: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    contact: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    interview: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    interviewNote: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
  }
}));

describe("interview routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: "user-1" } as any);
  });

  it("lists interviews with application context", async () => {
    vi.mocked(prisma.interview.findMany).mockResolvedValue([
      {
        id: "interview-1",
        roundName: "Architecture Screen",
        application: { roleTitle: "Senior Engineer", company: { name: "Northstar Systems" } }
      }
    ] as any);

    const response = await request(createApp()).get("/api/v1/interviews");

    expect(response.status).toBe(200);
    expect(response.body[0].roundName).toBe("Architecture Screen");
  });

  it("creates an interview linked to an application", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ id: "app-1" } as any);
    vi.mocked(prisma.interview.create).mockResolvedValue({ id: "interview-1", roundName: "Architecture Screen" } as any);

    const response = await request(createApp()).post("/api/v1/interviews").send({
      applicationId: "app-1",
      roundName: "Architecture Screen",
      roundNumber: 2,
      type: "SYSTEM_DESIGN",
      format: "VIDEO",
      scheduledAt: "2026-06-10T15:00:00.000Z",
      durationMinutes: 60,
      outcome: "SCHEDULED"
    });

    expect(response.status).toBe(201);
    expect(prisma.interview.create).toHaveBeenCalled();
  });

  it("rejects interview creation when application does not exist", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

    const response = await request(createApp()).post("/api/v1/interviews").send({
      applicationId: "missing-app",
      roundName: "Architecture Screen",
      roundNumber: 2,
      type: "SYSTEM_DESIGN",
      format: "VIDEO",
      scheduledAt: "2026-06-10T15:00:00.000Z",
      durationMinutes: 60,
      outcome: "SCHEDULED"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Application does not exist");
  });

  it("creates a note linked to an interview", async () => {
    vi.mocked(prisma.interview.findFirst).mockResolvedValue({ id: "interview-1" } as any);
    vi.mocked(prisma.interviewNote.create).mockResolvedValue({ id: "note-1", type: "PREP" } as any);

    const response = await request(createApp()).post("/api/v1/interviews/interview-1/notes").send({
      type: "PREP",
      body: "Review system design tradeoffs."
    });

    expect(response.status).toBe(201);
    expect(prisma.interviewNote.create).toHaveBeenCalled();
  });

  it("updates an interview note", async () => {
    vi.mocked(prisma.interviewNote.findFirst).mockResolvedValue({ id: "note-1" } as any);
    vi.mocked(prisma.interviewNote.update).mockResolvedValue({ id: "note-1", body: "Updated prep notes." } as any);

    const response = await request(createApp()).patch("/api/v1/interview-notes/note-1").send({
      type: "PREP",
      body: "Updated prep notes."
    });

    expect(response.status).toBe(200);
    expect(prisma.interviewNote.update).toHaveBeenCalled();
  });

  it("deletes an interview note", async () => {
    vi.mocked(prisma.interviewNote.findFirst).mockResolvedValue({ id: "note-1" } as any);
    vi.mocked(prisma.interviewNote.delete).mockResolvedValue({ id: "note-1" } as any);

    const response = await request(createApp()).delete("/api/v1/interview-notes/note-1");

    expect(response.status).toBe(204);
    expect(prisma.interviewNote.delete).toHaveBeenCalledWith({ where: { id: "note-1" } });
  });

  it("rejects note creation when interview does not exist", async () => {
    vi.mocked(prisma.interview.findFirst).mockResolvedValue(null);

    const response = await request(createApp()).post("/api/v1/interviews/missing-interview/notes").send({
      type: "PREP",
      body: "Review system design tradeoffs."
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Interview does not exist");
  });
});
