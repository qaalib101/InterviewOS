import { Router } from "express";
import { logInfo, logWarn } from "../shared/logger.js";
import { getAiProvider } from "./ai/providerFactory.js";

export const aiRouter = Router();

aiRouter.get("/status", (_req, res) => {
  const status = getAiProvider().status();
  const context = { provider: status.provider, available: status.available };
  if (status.available) logInfo("ai_provider_status_checked", context);
  else logWarn("ai_provider_unavailable", context);
  res.json(status);
});
