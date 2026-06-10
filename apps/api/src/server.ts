import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logInfo } from "./shared/logger.js";

createApp().listen(env.port, () => {
  logInfo("api_started", { port: env.port });
});
