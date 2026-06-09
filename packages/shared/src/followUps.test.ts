import { describe, expect, it } from "vitest";
import { followUpInputSchema } from "./followUps.js";

describe("follow-up schemas", () => {
  it("validates an application follow-up", () => {
    const result = followUpInputSchema.safeParse({
      applicationId: "app-1",
      title: "Send thank-you email",
      dueAt: "2026-06-10T15:00:00.000Z",
      priority: "HIGH",
      type: "THANK_YOU"
    });

    expect(result.success).toBe(true);
  });

  it("validates a contact follow-up", () => {
    const result = followUpInputSchema.safeParse({
      contactId: "contact-1",
      title: "Check in with talent contact",
      dueAt: "2026-06-12T15:00:00.000Z",
      priority: "MEDIUM",
      type: "CHECK_IN",
      notes: "Ask about next steps."
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid priority", () => {
    const result = followUpInputSchema.safeParse({
      title: "Bad priority",
      dueAt: "2026-06-12T15:00:00.000Z",
      priority: "URGENT",
      type: "EMAIL"
    });

    expect(result.success).toBe(false);
  });
});
