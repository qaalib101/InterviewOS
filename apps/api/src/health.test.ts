import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

function invokeRoute(path: string) {
  const app = createApp() as any;
  const layer = app._router.stack.find((item: any) => item.route?.path === path);
  const handler = layer?.route.stack[0].handle;
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    json(body: unknown) {
      this.body = body;
      return this;
    }
  };

  handler({}, response);
  return response;
}

describe("foundation API", () => {
  it("returns health status", () => {
    const response = invokeRoute("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns project metadata", () => {
    const response = invokeRoute("/api/v1/meta");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      name: "Interview OS",
      currentMilestone: "Milestone 1: Project Foundation"
    });
  });
});
