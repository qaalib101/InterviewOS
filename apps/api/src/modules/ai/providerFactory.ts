import { env } from "../../config/env.js";
import type { AiProvider } from "./aiProvider.js";
import { DeepSeekProvider } from "./deepSeekProvider.js";
import { MockAiProvider } from "./mockAiProvider.js";
import { OllamaProvider } from "./ollamaProvider.js";
import { OpenAiProvider } from "./openAiProvider.js";

class UnavailableProvider implements AiProvider {
  constructor(public name: AiProvider["name"], private message: string) {}
  status() {
    return { provider: this.name, available: false, message: this.message };
  }
  async analyzeImport(): Promise<never> {
    throw new Error(this.message);
  }
}

export function getAiProvider(): AiProvider {
  if (env.aiProvider === "mock") return new MockAiProvider();
  if (env.aiProvider === "disabled") return new UnavailableProvider("disabled", "AI import analysis is disabled. Set AI_PROVIDER=mock for local analysis.");
  if (env.aiProvider === "openai") {
    if (!env.openAiApiKey) return new UnavailableProvider("openai", "OPENAI_API_KEY is missing. Set it or use AI_PROVIDER=mock.");
    return new OpenAiProvider(env.openAiApiKey);
  }
  if (env.aiProvider === "deepseek") {
    if (!env.deepSeekApiKey) return new UnavailableProvider("deepseek", "DEEPSEEK_API_KEY is missing. Set it or use AI_PROVIDER=mock.");
    return new DeepSeekProvider(env.deepSeekApiKey, env.deepSeekModel);
  }
  if (env.aiProvider === "ollama") {
    if (!env.ollamaBaseUrl || !env.ollamaModel) return new UnavailableProvider("ollama", "OLLAMA_BASE_URL and OLLAMA_MODEL are required. Set them or use AI_PROVIDER=mock.");
    return new OllamaProvider(env.ollamaBaseUrl, env.ollamaModel);
  }
  return new UnavailableProvider("disabled", "Unknown AI provider. Use AI_PROVIDER=mock.");
}
