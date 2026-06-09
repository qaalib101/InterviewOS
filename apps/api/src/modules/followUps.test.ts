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
    interviewNote: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    followUp: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
  }
}));

describe("follow-up routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: "user-1" } as any);
  });

  it("lists follow-ups", async () => {
    vi.mocked(prisma.followUp.findMany).mockResolvedValue([{ id: "follow-1", title: "Send thank-you" }] as any);

    const response = await request(createApp()).get("/api/v1/follow-ups");

    expect(response.status).toBe(200);
    expect(response.body[0].title).toBe("Send thank-you");
  });

  it("creates a follow-up linked to an application", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ id: "app-1" } as any);
    vi.mocked(prisma.followUp.create).mockResolvedValue({ id: "follow-1", title: "Send thank-you" } as any);

    const response = await request(createApp()).post("/api/v1/follow-ups").send({
      applicationId: "app-1",
      title: "Send thank-you",
      dueAt: "2026-06-10T15:00:00.000Z",
      priority: "HIGH",
      type: "THANK_YOU"
    });

    expect(response.status).toBe(201);
    expect(prisma.followUp.create).toHaveBeenCalled();
  });

  it("rejects creation with a missing linked contact", async () => {
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

    const response = await request(createApp()).post("/api/v1/follow-ups").send({
      contactId: "missing-contact",
      title: "Check in",
      dueAt: "2026-06-10T15:00:00.000Z",
      priority: "MEDIUM",
      type: "CHECK_IN"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Contact does not exist");
  });

  it("updates a follow-up", async () => {
    vi.mocked(prisma.followUp.findFirst).mockResolvedValue({ id: "follow-1" } as any);
    vi.mocked(prisma.followUp.update).mockResolvedValue({ id: "follow-1", priority: "LOW" } as any);

    const response = await request(createApp()).patch("/api/v1/follow-ups/follow-1").send({
      title: "Updated follow-up",
      dueAt: "2026-06-11T15:00:00.000Z",
      priority: "LOW",
      type: "EMAIL"
    });

    expect(response.status).toBe(200);
    expect(prisma.followUp.update).toHaveBeenCalled();
  });

  it("completes and reopens a follow-up", async () => {
    vi.mocked(prisma.followUp.findFirst).mockResolvedValue({ id: "follow-1" } as any);
    vi.mocked(prisma.followUp.update).mockResolvedValue({ id: "follow-1" } as any);

    const complete = await request(createApp()).patch("/api/v1/follow-ups/follow-1/complete");
    const reopen = await request(createApp()).patch("/api/v1/follow-ups/follow-1/reopen");

    expect(complete.status).toBe(200);
    expect(reopen.status).toBe(200);
    expect(prisma.followUp.update).toHaveBeenCalledTimes(2);
  });

  it("deletes a follow-up", async () => {
    vi.mocked(prisma.followUp.findFirst).mockResolvedValue({ id: "follow-1" } as any);
    vi.mocked(prisma.followUp.delete).mockResolvedValue({ id: "follow-1" } as any);

    const response = await request(createApp()).delete("/api/v1/follow-ups/follow-1");

    expect(response.status).toBe(204);
    expect(prisma.followUp.delete).toHaveBeenCalledWith({ where: { id: "follow-1" } });
  });
});
