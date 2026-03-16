import type { IncidentAnalysisInput, RagContextItem } from "@/lib/analysis/types";
import { embedText, hasEmbeddingConfig } from "@/lib/llm/embeddings";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server-client";

type KnowledgeRow = {
  title: string;
  category: string | null;
  keywords: string | null;
  symptom: string | null;
  possible_cause: string | null;
  solution: string | null;
  source: string | null;
};

type VectorKnowledgeRow = KnowledgeRow & {
  similarity: number | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_DB_ROWS = 30;
const MAX_CONTEXT_ITEMS = 5;
const MAX_SEARCH_TERMS = 12;
const MAX_SCORING_TERMS = 24;
const MIN_KEYWORD_SCORE = 6;
const MIN_GENERIC_KEYWORD_SCORE = 12;
const MIN_VECTOR_SIMILARITY = 0.55;
const MIN_GENERIC_VECTOR_SIMILARITY = 0.68;
const MIN_VECTOR_LEXICAL_SCORE = 4;
const STRICT_ERROR_TYPES = new Set(["generic_error", "http_5xx", "exception"]);

const ERROR_TYPE_HINTS: Record<string, string[]> = {
  connection_refused: [
    "connection refused",
    "connect refused",
    "could not connect",
    "target unavailable",
    "dependency unavailable",
  ],
  timeout: [
    "timeout",
    "timed out",
    "deadline exceeded",
    "read timeout",
    "connect timeout",
    "pool exhausted",
    "thread pool",
  ],
  http_5xx: [
    "service unavailable",
    "dependency unavailable",
    "downstream unavailable",
    "upstream",
    "gateway",
    "rpc",
    "server error",
    "5xx",
  ],
  exception: [
    "exception",
    "traceback",
    "stack trace",
    "nullpointerexception",
    "illegalstateexception",
    "keyerror",
    "valueerror",
    "outofmemoryerror",
  ],
};

const ERROR_TYPE_CONFLICTS: Record<string, string[]> = {
  http_5xx: [
    "ssl",
    "certificate",
    "pkix",
    "traceback",
    "nullpointerexception",
    "illegalstateexception",
    "keyerror",
    "valueerror",
    "outofmemoryerror",
    "json parse",
    "deserialization",
  ],
  timeout: ["ssl", "certificate", "pkix", "traceback", "nullpointerexception"],
  connection_refused: ["ssl", "certificate", "pkix", "traceback"],
  exception: ["quota exceeded", "rate limit", "too many requests"],
};

function normalizeText(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

function tokenizeText(value: string) {
  return value
    .split(/[^a-z0-9_\u4e00-\u9fa5]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 || /[\u4e00-\u9fa5]/.test(term));
}

function expandSourceHints(sourceType: string) {
  switch (sourceType) {
    case "nginx":
      return ["nginx", "web"];
    case "postgres":
      return ["postgres", "postgresql", "database"];
    case "application":
      return ["application", "runtime", "java", "python", "spring"];
    case "system":
      return ["system", "kernel", "service", "linux"];
    default:
      return [];
  }
}

function extractRawPhrases(rawText: string) {
  return rawText
    .toLowerCase()
    .split(/[|,;]+/)
    .map((part) => part.trim())
    .map((part) => part.replace(/\s+/g, " "))
    .filter((part) => part.length >= 8)
    .filter((part) => /[a-z\u4e00-\u9fa5]/.test(part))
    .slice(0, 8);
}

function buildQueryTerms(input: IncidentAnalysisInput) {
  const rawText = normalizeText(input.incident.rawText);
  const ruleName = normalizeText(input.incident.ruleName);
  const sourceType = normalizeText(input.sourceType);
  const errorType = normalizeText(input.incident.errorType);
  const sourceHints = expandSourceHints(sourceType);
  const phrases = extractRawPhrases(rawText);

  const searchTerms = Array.from(
    new Set(
      [sourceType, errorType, ruleName, ...sourceHints, ...phrases]
        .flatMap((value) => tokenizeText(value))
        .filter(Boolean),
    ),
  ).slice(0, MAX_SEARCH_TERMS);

  const scoringTerms = Array.from(
    new Set(
      [
        sourceType,
        errorType,
        ruleName,
        rawText,
        ...sourceHints,
        ...phrases,
        ...tokenizeText(`${sourceType} ${errorType} ${ruleName} ${rawText}`),
      ].filter(Boolean),
    ),
  ).slice(0, MAX_SCORING_TERMS);

  return {
    searchTerms,
    scoringTerms,
    phrases,
    rawText,
    sourceType,
    errorType,
    ruleName,
  };
}

function countMatches(value: string, terms: string[], weight: number) {
  return terms.reduce((score, term) => {
    if (!term || !value.includes(term)) {
      return score;
    }

    return score + weight;
  }, 0);
}

function matchesSourceDomain(row: KnowledgeRow, sourceType: string) {
  if (!sourceType) {
    return true;
  }

  const domainText = [
    normalizeText(row.title),
    normalizeText(row.category),
    normalizeText(row.keywords),
    normalizeText(row.source),
  ].join(" ");

  return expandSourceHints(sourceType).some((hint) => domainText.includes(hint));
}

function buildRowText(row: KnowledgeRow) {
  return [
    normalizeText(row.title),
    normalizeText(row.category),
    normalizeText(row.keywords),
    normalizeText(row.symptom),
    normalizeText(row.possible_cause),
    normalizeText(row.solution),
    normalizeText(row.source),
  ].join(" ");
}

function scoreErrorTypeAlignment(errorType: string, row: KnowledgeRow, evidenceText: string) {
  const rowText = buildRowText(row);
  const hints = ERROR_TYPE_HINTS[errorType] ?? [];
  const conflicts = ERROR_TYPE_CONFLICTS[errorType] ?? [];

  let score = 0;
  score += countMatches(rowText, hints, 5);

  for (const term of conflicts) {
    if (rowText.includes(term) && !evidenceText.includes(term)) {
      score -= 12;
    }
  }

  if (STRICT_ERROR_TYPES.has(errorType) && hints.length > 0 && !hints.some((term) => rowText.includes(term))) {
    score -= 6;
  }

  return score;
}

function scoreKnowledgeRow(
  row: KnowledgeRow,
  scoringTerms: string[],
  phrases: string[],
  rawText: string,
  sourceType: string,
  errorType: string,
  ruleName: string,
) {
  const title = normalizeText(row.title);
  const category = normalizeText(row.category);
  const keywords = normalizeText(row.keywords);
  const symptom = normalizeText(row.symptom);
  const possibleCause = normalizeText(row.possible_cause);
  const solution = normalizeText(row.solution);
  const source = normalizeText(row.source);
  const evidenceText = [rawText, ...scoringTerms, ...phrases].join(" ");

  let score = 0;

  score += countMatches(title, scoringTerms, 8);
  score += countMatches(keywords, scoringTerms, 6);
  score += countMatches(category, scoringTerms, 5);
  score += countMatches(symptom, scoringTerms, 4);
  score += countMatches(possibleCause, scoringTerms, 3);
  score += countMatches(solution, scoringTerms, 2);
  score += countMatches(source, scoringTerms, 1);

  score += phrases.reduce((total, phrase) => {
    let phraseScore = 0;

    if (title.includes(phrase)) phraseScore += 10;
    if (keywords.includes(phrase)) phraseScore += 8;
    if (symptom.includes(phrase)) phraseScore += 5;

    return total + phraseScore;
  }, 0);

  if (sourceType && (category.includes(sourceType) || keywords.includes(sourceType))) {
    score += 6;
  }

  if (errorType && (category.includes(errorType) || keywords.includes(errorType))) {
    score += 5;
  }

  if (ruleName && (title.includes(ruleName) || keywords.includes(ruleName))) {
    score += 4;
  }

  score += scoreErrorTypeAlignment(errorType, row, evidenceText);

  return score;
}

function buildKnowledgeSummary(row: KnowledgeRow) {
  return [row.symptom, row.possible_cause, row.solution].filter(Boolean).join(" / ");
}

function mergeKnowledgeContexts(...groups: RagContextItem[][]) {
  const merged = new Map<string, RagContextItem>();

  for (const items of groups) {
    for (const item of items) {
      const key = item.title.toLowerCase();
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, item);
        continue;
      }

      merged.set(key, {
        ...existing,
        summary: existing.summary.length >= item.summary.length ? existing.summary : item.summary,
        source: existing.source || item.source,
        score: Math.max(existing.score ?? 0, item.score ?? 0),
      });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title))
    .slice(0, MAX_CONTEXT_ITEMS);
}

async function resolveKeywordKnowledgeContext(
  supabase: SupabaseServerClient,
  input: IncidentAnalysisInput,
) {
  const { searchTerms, scoringTerms, phrases, rawText, sourceType, errorType, ruleName } =
    buildQueryTerms(input);

  if (searchTerms.length === 0) {
    return [] as RagContextItem[];
  }

  const orQuery = searchTerms
    .flatMap((term) => [
      `title.ilike.%${term}%`,
      `keywords.ilike.%${term}%`,
      `symptom.ilike.%${term}%`,
      `possible_cause.ilike.%${term}%`,
      `solution.ilike.%${term}%`,
      `category.ilike.%${term}%`,
    ])
    .join(",");

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("title, category, keywords, symptom, possible_cause, solution, source")
    .or(orQuery)
    .limit(MAX_DB_ROWS);

  if (error || !data) {
    return [] as RagContextItem[];
  }

  const isGenericError = errorType === "generic_error";
  const isStrictErrorType = STRICT_ERROR_TYPES.has(errorType);

  return (data as KnowledgeRow[])
    .map((row) => ({
      row,
      score: scoreKnowledgeRow(row, scoringTerms, phrases, rawText, sourceType, errorType, ruleName),
      sourceAligned: matchesSourceDomain(row, sourceType),
    }))
    .filter((item) => {
      if (isGenericError) {
        return item.sourceAligned && item.score >= MIN_GENERIC_KEYWORD_SCORE;
      }

      if (item.score < MIN_KEYWORD_SCORE) {
        return false;
      }

      if (isStrictErrorType) {
        return item.sourceAligned && item.score >= MIN_KEYWORD_SCORE + 6;
      }

      return item.sourceAligned || item.score >= MIN_KEYWORD_SCORE + 4;
    })
    .sort(
      (a, b) =>
        Number(b.sourceAligned) - Number(a.sourceAligned) ||
        b.score - a.score ||
        a.row.title.localeCompare(b.row.title),
    )
    .slice(0, MAX_CONTEXT_ITEMS)
    .map(({ row, score, sourceAligned }) => ({
      title: row.title,
      summary: buildKnowledgeSummary(row),
      source: row.source || row.category || "knowledge_base",
      score: score + (sourceAligned ? 4 : 0),
    }));
}

async function resolveVectorKnowledgeContext(
  supabase: SupabaseServerClient,
  input: IncidentAnalysisInput,
) {
  if (!hasEmbeddingConfig()) {
    return [] as RagContextItem[];
  }

  const { scoringTerms, phrases, rawText, sourceType, errorType, ruleName } = buildQueryTerms(input);
  const embeddingInput = [
    input.sourceType,
    input.incident.ruleName,
    input.incident.errorType,
    input.incident.rawText,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);

  const embedding = await embedText(embeddingInput);
  if (!embedding) {
    return [] as RagContextItem[];
  }

  const { data, error } = await supabase.rpc("match_knowledge_base", {
    query_embedding: embedding,
    match_count: MAX_DB_ROWS,
  });

  if (error || !data) {
    return [] as RagContextItem[];
  }

  const isGenericError = errorType === "generic_error";
  const isStrictErrorType = STRICT_ERROR_TYPES.has(errorType);

  return (data as VectorKnowledgeRow[])
    .map((row) => {
      const lexicalScore = scoreKnowledgeRow(
        row,
        scoringTerms,
        phrases,
        rawText,
        sourceType,
        errorType,
        ruleName,
      );
      const sourceAligned = matchesSourceDomain(row, sourceType);
      const similarity = row.similarity ?? 0;
      const combinedScore = Math.round(similarity * 20) + lexicalScore + (sourceAligned ? 4 : 0);

      return {
        row,
        similarity,
        lexicalScore,
        sourceAligned,
        combinedScore,
      };
    })
    .filter((item) => {
      if (isGenericError) {
        return (
          item.sourceAligned &&
          item.similarity >= MIN_GENERIC_VECTOR_SIMILARITY &&
          item.lexicalScore >= MIN_VECTOR_LEXICAL_SCORE
        );
      }

      if (item.similarity < MIN_VECTOR_SIMILARITY) {
        return false;
      }

      if (isStrictErrorType) {
        return item.sourceAligned && item.lexicalScore >= MIN_VECTOR_LEXICAL_SCORE + 4;
      }

      return item.sourceAligned || item.lexicalScore >= MIN_VECTOR_LEXICAL_SCORE;
    })
    .sort(
      (a, b) =>
        b.combinedScore - a.combinedScore ||
        b.similarity - a.similarity ||
        a.row.title.localeCompare(b.row.title),
    )
    .slice(0, MAX_CONTEXT_ITEMS)
    .map(({ row, combinedScore }) => ({
      title: row.title,
      summary: buildKnowledgeSummary(row),
      source: row.source || row.category || "knowledge_base",
      score: combinedScore,
    }));
}

export async function resolveKnowledgeBaseContext(
  input: IncidentAnalysisInput,
): Promise<RagContextItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const [keywordItems, vectorItems] = await Promise.all([
    resolveKeywordKnowledgeContext(supabase, input),
    resolveVectorKnowledgeContext(supabase, input),
  ]);

  return mergeKnowledgeContexts(keywordItems, vectorItems);
}