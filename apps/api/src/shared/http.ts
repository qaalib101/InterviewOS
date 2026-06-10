import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { env } from "../config/env.js";
import { logError, logInfo, logWarn } from "./logger.js";

export const localUserEmail = "local@interview-os.dev";

export async function getLocalUserId(db: { user: { upsert: Function } }) {
  const user = await db.user.upsert({
    where: { email: localUserEmail },
    update: { name: env.localUserName },
    create: {
      email: localUserEmail,
      name: env.localUserName
    }
  });

  return user.id as string;
}


export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on("finish", () => {
    if (req.path === "/health") return;
    const durationMs = Date.now() - startedAt;
    const context = { method: req.method, path: req.originalUrl, statusCode: res.statusCode, durationMs };
    if (res.statusCode >= 500) logError("http_request_failed", context);
    else if (res.statusCode >= 400) logWarn("http_request_warning", context);
    else logInfo("http_request_completed", context);
  });

  next();
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten()
      });
    }

    req.body = result.data;
    next();
  };
}

export function asyncHandler(handler: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  logError("unhandled_request_error", {
    method: req.method,
    path: req.originalUrl,
    message: error instanceof Error ? error.message : "Unknown error"
  });
  res.status(500).json({ error: "Internal server error" });
}
