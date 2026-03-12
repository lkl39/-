import { buildRuleAnalysisDraft } from "@/lib/analysis/rule-analysis";
import type {
  IncidentAnalysisInput,
  NormalizedAnalysisResult,
  RagContextItem,
} from "@/lib/analysis/types";
import { getLlmProvider } from "@/lib/llm";
import type { LlmProviderId } from "@/lib/llm/types";

type AnalyzeIncidentsOptions = {
  providerId?: LlmProviderId | null;
  resolveRagContext?: (input: IncidentAnalysisInput) => Promise<RagContextItem[]>;
};

export async function analyzeIncidents(
  inputs: IncidentAnalysisInput[],
  options: AnalyzeIncidentsOptions = {},
) {
  const provider = getLlmProvider(options.providerId);
  const results: NormalizedAnalysisResult[] = [];

  for (const input of inputs) {
    const ragContext = input.ragContext ?? (await options.resolveRagContext?.(input)) ?? [];

    if (!provider) {
      results.push(buildRuleOnlyResult(input, ragContext));
      continue;
    }

    try {
      const startedAt = Date.now();
      const response = await provider.analyzeIncident({
        sourceType: input.sourceType,
        logContent: input.logContent,
        incident: input.incident,
        ragContext,
      });

      results.push({
        cause: response.cause,
        riskLevel: response.riskLevel,
        confidence: response.confidence,
        repairSuggestion: response.repairSuggestion,
        ragContext,
        modelName: response.model ?? provider.model,
        latencyMs: Date.now() - startedAt,
        tokensUsed: response.tokensUsed ?? 0,
        providerId: provider.id,
        source: "llm",
      });
    } catch {
      results.push(buildRuleOnlyResult(input, ragContext));
    }
  }

  return results;
}

function buildRuleOnlyResult(
  input: IncidentAnalysisInput,
  ragContext: RagContextItem[],
): NormalizedAnalysisResult {
  const draft = buildRuleAnalysisDraft(input.incident, input.sourceType);

  return {
    cause: draft.cause,
    riskLevel: draft.riskLevel,
    confidence: draft.confidence,
    repairSuggestion: draft.repairSuggestion,
    ragContext,
    modelName: "rule-engine-v1",
    latencyMs: null,
    tokensUsed: 0,
    providerId: "mock",
    source: "rule",
  };
}
