import type { AiProviderStatus, AnalyzeImportInput, ImportAnalysisResult } from "@interview-os/shared";

export interface AiProvider {
  name: AiProviderStatus["provider"];
  status(): AiProviderStatus;
  analyzeImport(input: AnalyzeImportInput): Promise<ImportAnalysisResult>;
}
