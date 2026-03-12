import type { LlmAnalysisResponse } from "@/lib/llm/types";

function normalizeRiskLevel(value: unknown): LlmAnalysisResponse["riskLevel"] {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizeConfidence(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);

  if (!Number.isFinite(numeric)) {
    return 0.65;
  }

  if (numeric < 0) {
    return 0;
  }

  if (numeric > 1) {
    return 1;
  }

  return numeric;
}

export function validateLlmAnalysisResponse(payload: unknown): LlmAnalysisResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Model response was not a JSON object.");
  }

  const record = payload as Record<string, unknown>;
  const cause = typeof record.cause === "string" ? record.cause.trim() : "";
  const repairSuggestion =
    typeof record.repairSuggestion === "string"
      ? record.repairSuggestion.trim()
      : "";

  if (!cause || !repairSuggestion) {
    throw new Error("Model response was missing cause or repairSuggestion.");
  }

  return {
    cause,
    riskLevel: normalizeRiskLevel(record.riskLevel),
    confidence: normalizeConfidence(record.confidence),
    repairSuggestion,
    tokensUsed:
      typeof record.tokensUsed === "number"
        ? record.tokensUsed
        : Number(record.tokensUsed ?? 0),
    rawResponse:
      typeof record.rawResponse === "string" ? record.rawResponse : undefined,
  };
}
