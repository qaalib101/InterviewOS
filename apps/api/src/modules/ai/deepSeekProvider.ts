import type { AnalyzeImportInput, ImportAnalysisResult } from "@interview-os/shared";
import type { AiProvider } from "./aiProvider.js";
import { buildImportPrompt, extractJsonObject } from "./prompt.js";

export class DeepSeekProvider implements AiProvider {
  name = "deepseek" as const;
  constructor(private apiKey: string, private model = "deepseek-v4-flash") {}

  status() {
    return { provider: this.name, available: true, message: `DeepSeek provider is configured with model ${this.model}.` };
  }

  async analyzeImport(input: AnalyzeImportInput): Promise<ImportAnalysisResult> {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: "Return valid JSON only. Do not include markdown." },
          { role: "user", content: buildImportPrompt(input) }
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: 4096
      })
    });

    if (!response.ok) throw new Error(await deepSeekErrorMessage(response));

    const payload = await response.json() as any;
    const finishReason = payload.choices?.[0]?.finish_reason;
    if (finishReason === "length") throw new Error("DeepSeek response was truncated. Try a shorter import text or increase max_tokens.");
    if (finishReason === "content_filter") throw new Error("DeepSeek content filter blocked the import analysis.");
    if (finishReason === "insufficient_system_resource") throw new Error("DeepSeek did not have enough inference capacity. Try again later or switch AI_PROVIDER=mock.");

    return extractJsonObject(String(payload.choices?.[0]?.message?.content ?? "")) as ImportAnalysisResult;
  }
}

async function deepSeekErrorMessage(response: Response) {
  const body = await response.text().catch(() => "");
  const providerMessage = parseProviderMessage(body);
  const suffix = providerMessage ? ` Provider message: ${providerMessage}` : "";

  if (response.status === 400) return `DeepSeek rejected the request format. Check model and JSON mode settings.${suffix}`;
  if (response.status === 401) return `DeepSeek authentication failed. Check DEEPSEEK_API_KEY.${suffix}`;
  if (response.status === 402) return `DeepSeek account has insufficient balance. Add funds in DeepSeek or switch AI_PROVIDER=mock.${suffix}`;
  if (response.status === 422) return `DeepSeek rejected one or more request parameters. Check the configured model.${suffix}`;
  if (response.status === 429) return `DeepSeek rate limit reached. Try again later or switch AI_PROVIDER=mock.${suffix}`;
  if (response.status === 500) return `DeepSeek server error. Try again later.${suffix}`;
  if (response.status === 503) return `DeepSeek server is overloaded. Try again later.${suffix}`;
  return `DeepSeek import analysis failed with status ${response.status}.${suffix}`;
}

function parseProviderMessage(body: string) {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body);
    return parsed.error?.message ?? parsed.message ?? "";
  } catch {
    return body.slice(0, 300);
  }
}
