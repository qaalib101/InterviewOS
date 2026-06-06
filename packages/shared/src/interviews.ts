import { z } from "zod";

export const interviewTypes = ["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN", "HIRING_MANAGER", "RECRUITER", "PANEL", "OTHER"] as const;
export const interviewFormats = ["PHONE", "VIDEO", "ONSITE", "TAKE_HOME", "OTHER"] as const;
export const interviewOutcomes = ["SCHEDULED", "COMPLETED", "PASSED", "FAILED", "CANCELLED", "UNKNOWN"] as const;
export const interviewNoteTypes = ["PREP", "RAW_POST_INTERVIEW", "STRUCTURED_ANALYSIS", "FEEDBACK", "FOLLOW_UP_DRAFT"] as const;

export const interviewAnalysisSchema = z.object({
  summary: z.string(),
  whatWentWell: z.array(z.string()),
  concerns: z.array(z.string()),
  likelyInterviewerConcerns: z.array(z.string()),
  followUpActions: z.array(z.string()),
  studyTopics: z.array(z.string()),
  confidenceScore: z.coerce.number().int().min(1).max(5)
});

const interviewBaseSchema = z.object({
  applicationId: z.string().trim().min(1, "Application is required"),
  roundName: z.string().trim().min(1, "Round name is required"),
  roundNumber: z.coerce.number().int().min(1),
  type: z.enum(interviewTypes),
  format: z.enum(interviewFormats),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(1),
  interviewers: z.string().trim().optional().nullable(),
  expectedTopics: z.string().trim().optional().nullable(),
  prepNotes: z.string().trim().optional().nullable(),
  rawPostInterviewNotes: z.string().trim().optional().nullable(),
  outcome: z.enum(interviewOutcomes)
});

export const interviewInputSchema = interviewBaseSchema;
export const interviewUpdateSchema = interviewBaseSchema.partial();

export const interviewNoteInputSchema = z.object({
  type: z.enum(interviewNoteTypes),
  body: z.string().trim().min(1, "Note body is required"),
  analysis: interviewAnalysisSchema.optional().nullable()
});

export const interviewNoteUpdateSchema = interviewNoteInputSchema.partial();

export type InterviewInput = z.infer<typeof interviewInputSchema>;
export type InterviewNoteInput = z.infer<typeof interviewNoteInputSchema>;
export type InterviewAnalysis = z.infer<typeof interviewAnalysisSchema>;
export type InterviewType = (typeof interviewTypes)[number];
export type InterviewFormat = (typeof interviewFormats)[number];
export type InterviewOutcome = (typeof interviewOutcomes)[number];
export type InterviewNoteType = (typeof interviewNoteTypes)[number];
