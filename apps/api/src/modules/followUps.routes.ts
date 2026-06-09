import { followUpInputSchema, followUpUpdateSchema } from "@interview-os/shared";
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler, getLocalUserId, validateBody } from "../shared/http.js";

export const followUpsRouter = Router();

const followUpInclude = {
  application: { include: { company: true } },
  contact: true,
  interview: true
};

followUpsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getLocalUserId(prisma);
    const followUps = await prisma.followUp.findMany({
      where: { userId },
      orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
      include: followUpInclude
    });

    res.json(followUps);
  })
);

followUpsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const followUp = await prisma.followUp.findFirst({
      where: { id, userId },
      include: followUpInclude
    });

    if (!followUp) return res.status(404).json({ error: "Follow-up not found" });
    res.json(followUp);
  })
);

followUpsRouter.post(
  "/",
  validateBody(followUpInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const invalidLink = await validateLinks(req.body, userId);
    if (invalidLink) return res.status(400).json({ error: invalidLink });

    const followUp = await prisma.followUp.create({
      data: { ...req.body, userId },
      include: followUpInclude
    });

    res.status(201).json(followUp);
  })
);

followUpsRouter.patch(
  "/:id",
  validateBody(followUpUpdateSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.followUp.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Follow-up not found" });

    const invalidLink = await validateLinks(req.body, userId);
    if (invalidLink) return res.status(400).json({ error: invalidLink });

    const followUp = await prisma.followUp.update({
      where: { id },
      data: req.body,
      include: followUpInclude
    });

    res.json(followUp);
  })
);

followUpsRouter.patch(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.followUp.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Follow-up not found" });

    const followUp = await prisma.followUp.update({
      where: { id },
      data: { completedAt: new Date() },
      include: followUpInclude
    });

    res.json(followUp);
  })
);

followUpsRouter.patch(
  "/:id/reopen",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.followUp.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Follow-up not found" });

    const followUp = await prisma.followUp.update({
      where: { id },
      data: { completedAt: null },
      include: followUpInclude
    });

    res.json(followUp);
  })
);

followUpsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.followUp.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Follow-up not found" });

    await prisma.followUp.delete({ where: { id } });
    res.status(204).send();
  })
);

async function validateLinks(
  body: { applicationId?: string | null; contactId?: string | null; interviewId?: string | null },
  userId: string
) {
  if (body.applicationId) {
    const application = await prisma.application.findFirst({ where: { id: body.applicationId, userId } });
    if (!application) return "Application does not exist";
  }

  if (body.contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: body.contactId, userId } });
    if (!contact) return "Contact does not exist";
  }

  if (body.interviewId) {
    const interview = await prisma.interview.findFirst({ where: { id: body.interviewId, userId } });
    if (!interview) return "Interview does not exist";
  }

  return null;
}
