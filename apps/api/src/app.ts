import { projectMeta } from "@interview-os/shared";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";

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

  return app;
}
