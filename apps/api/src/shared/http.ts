import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export const localUserEmail = "local@interview-os.dev";

export async function getLocalUserId(db: { user: { upsert: Function } }) {
  const user = await db.user.upsert({
    where: { email: localUserEmail },
    update: {},
    create: {
      email: localUserEmail,
      name: "Local User"
    }
  });

  return user.id as string;
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

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}
