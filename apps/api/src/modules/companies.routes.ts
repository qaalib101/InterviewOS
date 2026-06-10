import { companyInputSchema } from "@interview-os/shared";
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler, getLocalUserId, validateBody } from "../shared/http.js";
import { recordActivity } from "./activity.js";

export const companiesRouter = Router();

companiesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getLocalUserId(prisma);
    const companies = await prisma.company.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { applications: true, contacts: true } } }
    });

    res.json(companies);
  })
);

companiesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const company = await prisma.company.findFirst({
      where: { id, userId },
      include: { applications: true, contacts: true }
    });

    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json(company);
  })
);

companiesRouter.post(
  "/",
  validateBody(companyInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const company = await prisma.company.create({
      data: { ...req.body, userId }
    });

    await recordActivity(prisma, {
      userId,
      entityType: "COMPANY",
      entityId: company.id,
      eventType: "CREATED",
      metadata: { name: company.name }
    });

    res.status(201).json(company);
  })
);

companiesRouter.patch(
  "/:id",
  validateBody(companyInputSchema.partial()),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.company.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Company not found" });

    const company = await prisma.company.update({
      where: { id },
      data: req.body
    });

    await recordActivity(prisma, {
      userId,
      entityType: "COMPANY",
      entityId: company.id,
      eventType: "UPDATED",
      metadata: { name: company.name }
    });

    res.json(company);
  })
);

companiesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.company.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Company not found" });

    await recordActivity(prisma, {
      userId,
      entityType: "COMPANY",
      entityId: existing.id,
      eventType: "DELETED",
      metadata: { name: existing.name }
    });
    await prisma.company.delete({ where: { id } });
    res.status(204).send();
  })
);
