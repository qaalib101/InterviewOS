import { describe, expect, it } from "vitest";
import { activityEntityTypes, activityEventTypes } from "./dashboard.js";

describe("dashboard contracts", () => {
  it("includes activity entities used by current product records", () => {
    expect(activityEntityTypes).toContain("APPLICATION");
    expect(activityEntityTypes).toContain("FOLLOW_UP");
  });

  it("includes lifecycle events used by the activity stream", () => {
    expect(activityEventTypes).toContain("STAGE_CHANGED");
    expect(activityEventTypes).toContain("COMPLETED");
  });
});
