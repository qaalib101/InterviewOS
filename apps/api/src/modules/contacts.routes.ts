import { contactInputSchema } from "@interview-os/shared";
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler, getLocalUserId, validateBody } from "../shared/http.js";

export const contactsRouter = Router();

const contactInclude = {
  company: true,
  application: true
};

contactsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const userId = await getLocalUserId(prisma);
    const contacts = await prisma.contact.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: contactInclude
    });

    res.json(contacts);
  })
);

contactsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const contact = await prisma.contact.findFirst({
      where: { id, userId },
      include: contactInclude
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  })
);

contactsRouter.post(
  "/",
  validateBody(contactInputSchema),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    await validateLinks(req.body.companyId, req.body.applicationId, userId, res);
    if (res.headersSent) return;

    const contact = await prisma.contact.create({
      data: { ...req.body, userId },
      include: contactInclude
    });

    res.status(201).json(contact);
  })
);

contactsRouter.patch(
  "/:id",
  validateBody(contactInputSchema.partial()),
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.contact.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Contact not found" });

    await validateLinks(req.body.companyId, req.body.applicationId, userId, res);
    if (res.headersSent) return;

    const contact = await prisma.contact.update({
      where: { id },
      data: req.body,
      include: contactInclude
    });

    res.json(contact);
  })
);

contactsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = await getLocalUserId(prisma);
    const id = String(req.params.id);
    const existing = await prisma.contact.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Contact not found" });

    await prisma.contact.delete({ where: { id } });
    res.status(204).send();
  })
);

async function validateLinks(companyId: string | null | undefined, applicationId: string | null | undefined, userId: string, res: any) {
  if (companyId) {
    const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
    if (!company) return res.status(400).json({ error: "Company does not exist" });
  }

  if (applicationId) {
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId } });
    if (!application) return res.status(400).json({ error: "Application does not exist" });
  }
}
