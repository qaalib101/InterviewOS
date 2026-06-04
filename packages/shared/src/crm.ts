import { z } from "zod";

export const applicationStages = [
  "SAVED",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECH_SCREEN",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED"
] as const;

export const remoteModes = ["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"] as const;
export const priorities = ["LOW", "MEDIUM", "HIGH"] as const;

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional().nullable();
const optionalEmail = z.union([z.string().email(), z.literal("")]).optional().nullable();

export const companyInputSchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  website: optionalUrl,
  industry: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

const applicationBaseSchema = z.object({
  companyId: z.string().trim().min(1, "Company is required"),
  roleTitle: z.string().trim().min(1, "Role title is required"),
  jobUrl: optionalUrl,
  source: z.string().trim().optional().nullable(),
  stage: z.enum(applicationStages),
  compensationMin: z.coerce.number().int().nonnegative().optional().nullable(),
  compensationMax: z.coerce.number().int().nonnegative().optional().nullable(),
  remoteMode: z.enum(remoteModes),
  priority: z.enum(priorities),
  confidence: z.coerce.number().int().min(1).max(5).optional().nullable(),
  concerns: z.string().trim().optional().nullable(),
  nextAction: z.string().trim().optional().nullable(),
  nextActionAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

const compensationRangeRule = {
  message: "Minimum compensation cannot exceed maximum compensation",
  path: ["compensationMin"]
};

export const applicationInputSchema = applicationBaseSchema.refine(
  (data) => !data.compensationMin || !data.compensationMax || data.compensationMin <= data.compensationMax,
  compensationRangeRule
);

export const applicationUpdateSchema = applicationBaseSchema.partial().refine(
  (data) => !data.compensationMin || !data.compensationMax || data.compensationMin <= data.compensationMax,
  compensationRangeRule
);

export const contactInputSchema = z.object({
  companyId: z.string().trim().optional().nullable(),
  applicationId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "Contact name is required"),
  role: z.string().trim().optional().nullable(),
  email: optionalEmail,
  phone: z.string().trim().optional().nullable(),
  linkedinUrl: optionalUrl,
  notes: z.string().trim().optional().nullable()
});

export type CompanyInput = z.infer<typeof companyInputSchema>;
export type ApplicationInput = z.infer<typeof applicationInputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type ApplicationStage = (typeof applicationStages)[number];
export type RemoteMode = (typeof remoteModes)[number];
export type Priority = (typeof priorities)[number];
