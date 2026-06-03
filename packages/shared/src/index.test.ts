import { describe, expect, it } from "vitest";
import { projectMeta } from "./index.js";

describe("projectMeta", () => {
  it("exports the current project foundation metadata", () => {
    expect(projectMeta.name).toBe("Interview OS");
    expect(projectMeta.currentMilestone).toBe("Milestone 1: Project Foundation");
  });
});
