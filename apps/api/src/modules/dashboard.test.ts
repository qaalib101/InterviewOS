import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

vi.mock("../db/prisma.js", () => ({
  prisma: {
    user: { upsert: vi.fn() },
    activityEvent: { findMany: vi.fn(), create: vi.fn() },
    company: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    application: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    contact: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    interview: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), groupBy: vi.fn() },
    interviewNote: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    followUp: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), groupBy: vi.fn() }
  }
}));

describe("dashboard routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: "user-1" } as any);
    vi.mocked(prisma.application.findMany).mockResolvedValue([{ id: "app-1", roleTitle: "Senior Engineer" }] as any);
    vi.mocked(prisma.interview.findMany).mockResolvedValue([{ id: "interview-1", roundName: "Architecture Screen" }] as any);
    vi.mocked(prisma.followUp.findMany).mockResolvedValue([{ id: "follow-1", title: "Send thank-you" }] as any);
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([{ id: "event-1", eventType: "CREATED" }] as any);
    vi.mocked(prisma.application.groupBy).mockResolvedValue([{ stage: "TECH_SCREEN", _count: { stage: 1 } }] as any);
    vi.mocked(prisma.followUp.groupBy).mockResolvedValue([{ priority: "HIGH", _count: { priority: 1 } }] as any);
    vi.mocked(prisma.interview.groupBy).mockResolvedValue([{ outcome: "SCHEDULED", _count: { outcome: 1 } }] as any);
  });

  it("returns dashboard summary data", async () => {
    const response = await request(createApp()).get("/api/v1/dashboard");

    expect(response.status).toBe(200);
    expect(response.body.activeApplications).toHaveLength(1);
    expect(response.body.upcomingInterviews).toHaveLength(1);
    expect(response.body.dueFollowUps).toHaveLength(1);
    expect(response.body.recentActivity).toHaveLength(1);
    expect(response.body.pipelineByStage.find((bucket: any) => bucket.key === "TECH_SCREEN").count).toBe(1);
  });

  it("lists activity events", async () => {
    const response = await request(createApp()).get("/api/v1/activity");

    expect(response.status).toBe(200);
    expect(response.body[0].eventType).toBe("CREATED");
  });
});
