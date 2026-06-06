import { describe, expect, it } from "vitest";
import { interviewInputSchema, interviewNoteInputSchema } from "./interviews.js";

describe("interview schemas", () => {
  it("validates a scheduled interview round", () => {
    const result = interviewInputSchema.safeParse({
      applicationId: "app-1",
      roundName: "Architecture Screen",
      roundNumber: 2,
      type: "SYSTEM_DESIGN",
      format: "VIDEO",
      scheduledAt: "2026-06-10T15:00:00.000Z",
      durationMinutes: 60,
      outcome: "SCHEDULED"
    });

    expect(result.success).toBe(true);
  });

  it("validates a completed interview round", () => {
    const result = interviewInputSchema.safeParse({
      applicationId: "app-1",
      roundName: "Recruiter Screen",
      roundNumber: 1,
      type: "RECRUITER",
      format: "PHONE",
      scheduledAt: "2026-06-08T14:00:00.000Z",
      durationMinutes: 30,
      rawPostInterviewNotes: "Good conversation about team scope.",
      outcome: "COMPLETED"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid duration", () => {
    const result = interviewInputSchema.safeParse({
      applicationId: "app-1",
      roundName: "Technical Screen",
      roundNumber: 1,
      type: "TECHNICAL",
      format: "VIDEO",
      scheduledAt: "2026-06-08T14:00:00.000Z",
      durationMinutes: 0,
      outcome: "SCHEDULED"
    });

    expect(result.success).toBe(false);
  });

  it("validates a prep note", () => {
    const result = interviewNoteInputSchema.safeParse({
      type: "PREP",
      body: "Review Postgres indexing tradeoffs."
    });

    expect(result.success).toBe(true);
  });

  it("validates a structured analysis note shape", () => {
    const result = interviewNoteInputSchema.safeParse({
      type: "STRUCTURED_ANALYSIS",
      body: "Structured notes from interview.",
      analysis: {
        summary: "Clear architecture discussion.",
        whatWentWell: ["Explained tradeoffs clearly."],
        concerns: ["Needed more metrics."],
        likelyInterviewerConcerns: ["May want deeper scaling examples."],
        followUpActions: ["Send thank-you note."],
        studyTopics: ["Capacity estimates"],
        confidenceScore: 4
      }
    });

    expect(result.success).toBe(true);
  });
});
