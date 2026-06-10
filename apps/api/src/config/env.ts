import "dotenv/config";
import type { AiProviderName } from "@interview-os/shared";

const allowedAiProviders = new Set(["mock", "openai", "deepseek", "ollama", "disabled"]);
const configuredAiProvider = process.env.AI_PROVIDER ?? "mock";
const localUserName = process.env.LOCAL_USER_NAME ?? "Qaalib";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  localUserName,
  aiUserAliases: (process.env.AI_USER_ALIASES ?? localUserName).split(",").map((name) => name.trim()).filter(Boolean),
  aiProvider: (allowedAiProviders.has(configuredAiProvider) ? configuredAiProvider : "disabled") as AiProviderName,
  openAiApiKey: process.env.OPENAI_API_KEY,
  deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
  deepSeekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
  ollamaModel: process.env.OLLAMA_MODEL
};
