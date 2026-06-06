import { interviewInputSchema, interviewNoteInputSchema, interviewNoteUpdateSchema, interviewUpdateSchema } from "@interview-os/shared";
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler, getLocalUserId, validateBody } from "../shared/http.js";

export const interviewsRouter = Router();
export const interviewNotesRouter = Router();

const interviewInclude = {
  application: { include: { company: true } },
  notes: { orderBy: { createdAt: "desc" as const } }
};

interviewsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getLocalUserId(prisma);
    const interviews = await prisma.interview.findMany({
      where: { userId },
      orderBy: { scheduledAt: "asc" },
      include: interviewInclude
    });

    res.json(interviews);
  })
);

interviewsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const interview = await prisma.interview.findFirst({
      where: { id, userId },
      include: interviewInclude
    });

    if (!interview) return res.status(404).json({ error: "Interview not found" });
    res.json(interview);
  })
);

interviewsRouter.post(
  "/",
  validateBody(interviewInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const application = await prisma.application.findFirst({
      where: { id: req.body.applicationId, userId }
    });

    if (!application) return res.status(400).json({ error: "Application does not exist" });

    const interview = await prisma.interview.create({
      data: { ...req.body, userId },
      include: interviewInclude
    });

    res.status(201).json(interview);
  })
);

interviewsRouter.patch(
  "/:id",
  validateBody(interviewUpdateSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.interview.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Interview not found" });

    if (req.body.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: req.body.applicationId, userId }
      });
      if (!application) return res.status(400).json({ error: "Application does not exist" });
    }

    const interview = await prisma.interview.update({
      where: { id },
      data: req.body,
      include: interviewInclude
    });

    res.json(interview);
  })
);

interviewsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.interview.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Interview not found" });

    await prisma.interview.delete({ where: { id } });
    res.status(204).send();
  })
);

interviewsRouter.get(
  "/:id/notes",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const interviewId = String(req.params.id);
    const interview = await prisma.interview.findFirst({ where: { id: interviewId, userId } });
    if (!interview) return res.status(404).json({ error: "Interview not found" });

    const notes = await prisma.interviewNote.findMany({
      where: { interviewId, userId },
      orderBy: { createdAt: "desc" }
    });

    res.json(notes);
  })
);

interviewsRouter.post(
  "/:id/notes",
  validateBody(interviewNoteInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const interviewId = String(req.params.id);
    const interview = await prisma.interview.findFirst({ where: { id: interviewId, userId } });
    if (!interview) return res.status(400).json({ error: "Interview does not exist" });

    const note = await prisma.interviewNote.create({
      data: { ...req.body, interviewId, userId }
    });

    res.status(201).json(note);
  })
);

interviewNotesRouter.patch(
  "/:noteId",
  validateBody(interviewNoteUpdateSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.noteId);
    const existing = await prisma.interviewNote.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Interview note not found" });

    const note = await prisma.interviewNote.update({
      where: { id },
      data: req.body
    });

    res.json(note);
  })
);

interviewNotesRouter.delete(
  "/:noteId",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.noteId);
    const existing = await prisma.interviewNote.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Interview note not found" });

    await prisma.interviewNote.delete({ where: { id } });
    res.status(204).send();
  })
);
