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

const CONTEXT_LINES_BEFORE = 4;
const CONTEXT_LINES_AFTER = 6;
const MAX_EXCERPT_LENGTH = 2500;

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
        temperature: 0,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: [
              "你是一名谨慎的运维日志分析助手。",
              "你必须只输出合法 JSON，对象键严格为 cause、riskLevel、confidence、repairSuggestion。",
              "所有字段内容必须使用简体中文。",
              "你只能基于以下证据做判断：incident raw text、related log excerpt、retrieved knowledge。",
              "如果证据不足，必须明确说明‘根据当前日志无法确定具体组件’或‘证据不足，需进一步排查’。",
              "禁止凭空指定具体中间件、组件、服务名、数据库类型、消息队列类型、APM 产品名。",
              "只有当原始日志或召回知识里明确出现某个组件名称时，才可以提及它。",
              "如果召回知识与原始日志不一致，优先相信原始日志，并弱化或忽略该知识。",
              "只允许围绕当前异常及其附近上下文做分析，不要把远处的其他异常混进来。",
              "riskLevel 只能是 low、medium、high。",
              "confidence 必须是 0 到 1 之间的数字。",
              "repairSuggestion 必须给出保守、可执行的排查建议，不要编造不存在的系统现状。",
            ].join(" "),
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
      ? "未召回到可用知识。"
      : input.ragContext
          .map(
            (item, index) =>
              `${index + 1}. 标题: ${item.title}\n来源: ${item.source}\n摘要: ${item.summary}`,
          )
          .join("\n\n");

  const excerpt = extractIncidentExcerpt(input.logContent, input.incident.lineNumber);

  return [
    `日志来源类型: ${input.sourceType}`,
    `异常类型: ${input.incident.errorType}`,
    `异常行号: ${input.incident.lineNumber}`,
    `异常原文: ${input.incident.rawText}`,
    "",
    "当前异常附近上下文:",
    excerpt,
    "",
    "召回知识:",
    ragContextText,
    "",
    "输出要求:",
    "1. 只返回 JSON，不要返回 Markdown，不要返回解释文本。",
    "2. cause 只总结当前异常及附近上下文已经支持的原因，不要过度推断具体组件。",
    "3. 如果无法确定根因，cause 必须明确写出‘证据不足’或‘无法确定具体组件’。",
    "4. repairSuggestion 优先给排查动作，例如检查端口、依赖可达性、线程池、连接池、异常栈、邻近日志上下文。",
    "5. 不要把当前异常附近上下文以外的其他报错混进结论。",
    "6. 如果召回知识为空或相关性弱，请保持保守。",
    "",
    "只返回以下 JSON 结构:",
    '{ "cause": string, "riskLevel": "low" | "medium" | "high", "confidence": number, "repairSuggestion": string }',
  ].join("\n");
}

function extractIncidentExcerpt(logContent: string, lineNumber: number) {
  const lines = logContent.split(/\r\n|\r|\n/);
  if (lines.length === 0) {
    return logContent.slice(0, MAX_EXCERPT_LENGTH);
  }

  const resolvedLine = Number.isFinite(lineNumber) && lineNumber > 0 ? lineNumber : 1;
  const incidentIndex = Math.min(Math.max(resolvedLine - 1, 0), Math.max(lines.length - 1, 0));
  const start = Math.max(incidentIndex - CONTEXT_LINES_BEFORE, 0);
  const end = Math.min(incidentIndex + CONTEXT_LINES_AFTER + 1, lines.length);

  const excerpt = lines
    .slice(start, end)
    .map((line, index) => `${start + index + 1}: ${line}`)
    .join("\n")
    .trim();

  return excerpt.slice(0, MAX_EXCERPT_LENGTH);
}