import { z } from "zod";

export const importSourceTypes = ["recruiter_email", "linkedin_message", "job_description", "interview_notes", "follow_up", "unknown"] as const;
export const importSessionStatuses = ["DRAFT", "ANALYZED", "COMMITTED", "FAILED"] as const;
export const importProposalEntityTypes = ["COMPANY", "APPLICATION", "CONTACT", "INTERVIEW", "INTERVIEW_NOTE", "FOLLOW_UP"] as const;
export const importProposalOperations = ["CREATE", "UPDATE", "SKIP"] as const;

export const importProposalSchema = z.object({
  id: z.string().min(1),
  entityType: z.enum(importProposalEntityTypes),
  operation: z.enum(importProposalOperations),
  included: z.boolean(),
  confidence: z.coerce.number().min(0).max(1),
  matchReason: z.string().optional().nullable(),
  existingEntityId: z.string().optional().nullable(),
  proposedFields: z.record(z.unknown()),
  missingFields: z.array(z.string()),
  warnings: z.array(z.string())
});

export const importAnalysisResultSchema = z.object({
  summary: z.string().optional().default(""),
  proposals: z.array(importProposalSchema)
});

export const analyzeImportInputSchema = z.object({
  sourceType: z.enum(importSourceTypes).default("unknown"),
  rawText: z.string().trim().min(1, "Raw text is required")
});

export const updateImportProposalsInputSchema = z.object({
  analysis: importAnalysisResultSchema
});

export const commitImportInputSchema = z.object({
  analysis: z.unknown().optional()
});

export type ImportSourceType = (typeof importSourceTypes)[number];
export type ImportSessionStatus = (typeof importSessionStatuses)[number];
export type ImportProposalEntityType = (typeof importProposalEntityTypes)[number];
export type ImportProposalOperation = (typeof importProposalOperations)[number];
export type ImportProposal = z.infer<typeof importProposalSchema>;
export type ImportAnalysisResult = z.infer<typeof importAnalysisResultSchema>;
export type AnalyzeImportInput = z.infer<typeof analyzeImportInputSchema>;
