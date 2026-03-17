import { buildRuleAnalysisDraft } from "@/lib/analysis/rule-analysis";
import type {
  IncidentAnalysisInput,
  NormalizedAnalysisResult,
  RagContextItem,
} from "@/lib/analysis/types";
import { getLlmProvider } from "@/lib/llm";
import type { LlmProviderId } from "@/lib/llm/types";

const DEFAULT_ANALYSIS_CONCURRENCY = 3;

type AnalyzeIncidentsOptions = {
  providerId?: LlmProviderId | null;
  resolveRagContext?: (input: IncidentAnalysisInput) => Promise<RagContextItem[]>;
  concurrency?: number;
};

export async function analyzeIncidents(
  inputs: IncidentAnalysisInput[],
  options: AnalyzeIncidentsOptions = {},
) {
  const provider = getLlmProvider(options.providerId);
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_ANALYSIS_CONCURRENCY);

  return mapWithConcurrency(inputs, concurrency, async (input) => {
    const ragContext = input.ragContext ?? (await options.resolveRagContext?.(input)) ?? [];

    if (!provider) {
      return buildRuleOnlyResult(input, ragContext);
    }

    try {
      const startedAt = Date.now();
      const response = await provider.analyzeIncident({
        sourceType: input.sourceType,
        logContent: input.logContent,
        incident: input.incident,
        ragContext,
      });

      return {
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
      } satisfies NormalizedAnalysisResult;
    } catch {
      return buildRuleOnlyResult(input, ragContext);
    }
  });
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
) {
  if (items.length === 0) {
    return [] as TOutput[];
  }

  const results = new Array<TOutput>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

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
