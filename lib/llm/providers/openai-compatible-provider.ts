import { getLlmConfig } from "@/lib/llm/config";
import { validateLlmAnalysisResponse } from "@/lib/llm/schema";
import type { LlmProvider } from "@/lib/llm/types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
};

export function createOpenAiCompatibleProvider(): LlmProvider {
  const config = getLlmConfig();

  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error("Missing LLM_BASE_URL, LLM_API_KEY, or LLM_MODEL.");
  }

  return {
    id: "openai-compatible",
    model: config.model,
    async analyzeIncident(input) {
      const candidateModels = [config.model, config.fallbackModel].filter(
        (item, index, list) => Boolean(item) && list.indexOf(item) === index,
      );
      let lastError: Error | null = null;

      for (const model of candidateModels) {
        try {
          return await requestCompletion(model, input, config.baseUrl, config.apiKey, config.timeoutMs);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Unknown LLM request error.");
        }
      }

      throw lastError ?? new Error("Model request failed.");
    },
  };
}

async function requestCompletion(
  model: string,
  input: Parameters<LlmProvider["analyzeIncident"]>[0],
  baseUrl: string,
  apiKey: string,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You analyze operations logs. Return strict JSON with keys cause, riskLevel, confidence, repairSuggestion.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Model request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = normalizeContent(payload.choices?.[0]?.message?.content);

    if (!content) {
      throw new Error("Model response content was empty.");
    }

    const parsed = validateLlmAnalysisResponse(JSON.parse(content));

    return {
      ...parsed,
      model,
      tokensUsed: payload.usage?.total_tokens ?? parsed.tokensUsed ?? 0,
      rawResponse: content,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item.text === "string" ? item.text : ""))
      .join("")
      .trim();
  }

  return "";
}

function buildPrompt(input: Parameters<LlmProvider["analyzeIncident"]>[0]) {
  const ragContextText =
    input.ragContext.length === 0
      ? "No external knowledge snippets were retrieved."
      : input.ragContext
          .map(
            (item, index) =>
              `${index + 1}. ${item.title}\nSource: ${item.source}\nSummary: ${item.summary}`,
          )
          .join("\n\n");

  return [
    `Source type: ${input.sourceType}`,
    `Incident type: ${input.incident.errorType}`,
    `Incident line number: ${input.incident.lineNumber}`,
    `Incident raw text: ${input.incident.rawText}`,
    "",
    "Related log excerpt:",
    input.logContent.slice(0, 8000),
    "",
    "Retrieved knowledge:",
    ragContextText,
    "",
    "Return only JSON with:",
    '{ "cause": string, "riskLevel": "low" | "medium" | "high", "confidence": number between 0 and 1, "repairSuggestion": string }',
  ].join("\n");
}
