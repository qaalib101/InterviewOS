import type { AnalyzeImportInput, ImportAnalysisResult } from "@interview-os/shared";
import type { AiProvider } from "./aiProvider.js";
import { buildImportPrompt, extractJsonObject } from "./prompt.js";

export class OllamaProvider implements AiProvider {
  name = "ollama" as const;
  constructor(private baseUrl: string, private model: string) {}

  status() {
    return { provider: this.name, available: true, message: `Ollama provider is configured with model ${this.model}.` };
  }

  async analyzeImport(input: AnalyzeImportInput): Promise<ImportAnalysisResult> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, stream: false, messages: [{ role: "user", content: buildImportPrompt(input) }] })
    });
    if (!response.ok) throw new Error(`Ollama import analysis failed with status ${response.status}.`);
    const payload = await response.json() as any;
    return extractJsonObject(String(payload.message?.content ?? payload.response ?? "")) as ImportAnalysisResult;
  }
}
