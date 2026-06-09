import { z } from "zod";
import { priorities } from "./crm.js";

export const followUpTypes = ["EMAIL", "LINKEDIN", "THANK_YOU", "CHECK_IN", "PREP_TASK", "OTHER"] as const;

const followUpBaseSchema = z.object({
  applicationId: z.string().trim().optional().nullable(),
  contactId: z.string().trim().optional().nullable(),
  interviewId: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1, "Title is required"),
  dueAt: z.coerce.date(),
  priority: z.enum(priorities),
  type: z.enum(followUpTypes),
  notes: z.string().trim().optional().nullable()
});

export const followUpInputSchema = followUpBaseSchema;
export const followUpUpdateSchema = followUpBaseSchema.partial();

export type FollowUpInput = z.infer<typeof followUpInputSchema>;
export type FollowUpType = (typeof followUpTypes)[number];
