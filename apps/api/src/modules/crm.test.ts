import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

vi.mock("../db/prisma.js", () => ({
  prisma: {
    user: { upsert: vi.fn() },
    company: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    application: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    contact: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
  }
}));

describe("CRM routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: "user-1" } as any);
  });

  it("lists companies", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([{ id: "company-1", name: "Northstar Systems" }] as any);

    const response = await request(createApp()).get("/api/v1/companies");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "company-1", name: "Northstar Systems" }]);
  });

  it("creates a company", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "company-1", name: "Northstar Systems", userId: "user-1" } as any);

    const response = await request(createApp()).post("/api/v1/companies").send({ name: "Northstar Systems" });

    expect(response.status).toBe(201);
    expect(prisma.company.create).toHaveBeenCalledWith({ data: { name: "Northstar Systems", userId: "user-1" } });
  });

  it("creates an imported in-progress application", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue({ id: "company-1" } as any);
    vi.mocked(prisma.application.create).mockResolvedValue({ id: "app-1", stage: "TECH_SCREEN" } as any);

    const response = await request(createApp()).post("/api/v1/applications").send({
      companyId: "company-1",
      roleTitle: "Senior Engineer",
      stage: "TECH_SCREEN",
      remoteMode: "REMOTE",
      priority: "HIGH"
    });

    expect(response.status).toBe(201);
    expect(prisma.application.create).toHaveBeenCalled();
  });

  it("updates an application", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue({ id: "company-1" } as any);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ id: "app-1" } as any);
    vi.mocked(prisma.application.update).mockResolvedValue({ id: "app-1", stage: "ONSITE" } as any);

    const response = await request(createApp()).patch("/api/v1/applications/app-1").send({
      companyId: "company-1",
      roleTitle: "Senior Engineer",
      stage: "ONSITE",
      remoteMode: "REMOTE",
      priority: "HIGH"
    });

    expect(response.status).toBe(200);
    expect(prisma.application.update).toHaveBeenCalled();
  });

  it("deletes an application", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ id: "app-1" } as any);
    vi.mocked(prisma.application.delete).mockResolvedValue({ id: "app-1" } as any);

    const response = await request(createApp()).delete("/api/v1/applications/app-1");

    expect(response.status).toBe(204);
    expect(prisma.application.delete).toHaveBeenCalledWith({ where: { id: "app-1" } });
  });

  it("creates a linked contact", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue({ id: "company-1" } as any);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ id: "app-1" } as any);
    vi.mocked(prisma.contact.create).mockResolvedValue({ id: "contact-1", name: "Jamie Carter" } as any);

    const response = await request(createApp()).post("/api/v1/contacts").send({
      name: "Jamie Carter",
      companyId: "company-1",
      applicationId: "app-1",
      email: "jamie@example.com"
    });

    expect(response.status).toBe(201);
    expect(prisma.contact.create).toHaveBeenCalled();
  });
});
