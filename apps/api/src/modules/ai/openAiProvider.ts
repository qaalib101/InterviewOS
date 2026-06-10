import type { AnalyzeImportInput, ImportAnalysisResult } from "@interview-os/shared";
import type { AiProvider } from "./aiProvider.js";
import { buildImportPrompt, extractJsonObject } from "./prompt.js";

export class OpenAiProvider implements AiProvider {
  name = "openai" as const;
  constructor(private apiKey: string, private model = "gpt-5.5") {}

  status() {
    return { provider: this.name, available: true, message: `OpenAI provider is configured with model ${this.model}.` };
  }

  async analyzeImport(input: AnalyzeImportInput): Promise<ImportAnalysisResult> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: buildImportPrompt(input) })
    });
    if (!response.ok) throw new Error(`OpenAI import analysis failed with status ${response.status}.`);
    const payload = await response.json() as any;
    const text = payload.output_text ?? payload.output?.flatMap((item: any) => item.content ?? []).map((item: any) => item.text ?? "").join("\n");
    return extractJsonObject(String(text ?? "")) as ImportAnalysisResult;
  }
}
