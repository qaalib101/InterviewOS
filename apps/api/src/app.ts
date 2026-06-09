import { projectMeta } from "@interview-os/shared";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { applicationsRouter } from "./modules/applications.routes.js";
import { companiesRouter } from "./modules/companies.routes.js";
import { contactsRouter } from "./modules/contacts.routes.js";
import { followUpsRouter } from "./modules/followUps.routes.js";
import { interviewNotesRouter, interviewsRouter } from "./modules/interviews.routes.js";
import { errorHandler } from "./shared/http.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/v1/meta", (_req, res) => {
    res.json(projectMeta);
  });

  app.use("/api/v1/companies", companiesRouter);
  app.use("/api/v1/applications", applicationsRouter);
  app.use("/api/v1/contacts", contactsRouter);
  app.use("/api/v1/interviews", interviewsRouter);
  app.use("/api/v1/interview-notes", interviewNotesRouter);
  app.use("/api/v1/follow-ups", followUpsRouter);

  app.use(errorHandler);

  return app;
}
