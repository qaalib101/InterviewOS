import { z } from "zod";

export const aiProviders = ["mock", "openai", "deepseek", "ollama", "disabled"] as const;

export const aiProviderStatusSchema = z.object({
  provider: z.enum(aiProviders),
  available: z.boolean(),
  message: z.string()
});

export type AiProviderName = (typeof aiProviders)[number];
export type AiProviderStatus = z.infer<typeof aiProviderStatusSchema>;
