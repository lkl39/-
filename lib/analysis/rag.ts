import type { IncidentAnalysisInput, RagContextItem } from "@/lib/analysis/types";
import { buildEmbeddingInput, embedText, hasEmbeddingConfig } from "@/lib/llm/embeddings";
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

type HistoricalMissedCaseRow = {
  title: string;
  error_type: string | null;
  source_type: string | null;
  root_cause: string | null;
  repair_suggestion: string | null;
  source: string | null;
  similarity: number | null;
};

export type RagRetrievedCase = {
  title: string;
  errorType: string | null;
  similarityScore: number | null;
  rootCause: string | null;
  repairSuggestion: string | null;
  sourceType: string | null;
  summary: string;
  source: string;
};

export type RagResult = {
  incidentId: string;
  querySummary: string;
  retrievedCases: RagRetrievedCase[];
};

type RankedRetrievedCase = RagRetrievedCase & {
  rankScore: number;
  sourceAligned: boolean;
  dedupeKey: string;
};

type QueryTerms = ReturnType<typeof buildQueryTerms>;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_DB_ROWS = 30;
const MAX_CONTEXT_ITEMS = 5;
const MAX_SEARCH_TERMS = 12;
const MAX_SCORING_TERMS = 24;
const MAX_QUERY_SUMMARY_PHRASES = 3;
const MAX_EMBEDDING_INPUT_LENGTH = 2000;
const MIN_KEYWORD_SCORE = 6;
const MIN_GENERIC_KEYWORD_SCORE = 12;
const MIN_VECTOR_SIMILARITY = 0.55;
const MIN_GENERIC_VECTOR_SIMILARITY = 0.68;
const MIN_VECTOR_LEXICAL_SCORE = 4;
const STRICT_ERROR_TYPES = new Set(["generic_error", "http_5xx", "exception"]);

const SOURCE_TYPE_ALIASES: Record<string, string[]> = {
  nginx: ["nginx", "web"],
  postgres: ["postgres", "postgresql", "database"],
  application: ["application", "runtime", "java", "python", "spring"],
  system: ["system", "kernel", "service", "linux"],
};

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
  return SOURCE_TYPE_ALIASES[sourceType] ?? [];
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

function buildQuerySummary(queryTerms: QueryTerms) {
  const segments = [
    queryTerms.sourceType ? `sourceType=${queryTerms.sourceType}` : null,
    queryTerms.errorType ? `errorType=${queryTerms.errorType}` : null,
    queryTerms.ruleName ? `rule=${queryTerms.ruleName}` : null,
    queryTerms.phrases.length > 0
      ? `phrases=${queryTerms.phrases.slice(0, MAX_QUERY_SUMMARY_PHRASES).join(" | ")}`
      : null,
  ].filter(Boolean);

  if (segments.length > 0) {
    return segments.join("; ");
  }

  return queryTerms.rawText.slice(0, 120) || "no-query-context";
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

function inferSourceType(row: KnowledgeRow) {
  const rowText = buildRowText(row);

  for (const [sourceType, hints] of Object.entries(SOURCE_TYPE_ALIASES)) {
    if (hints.some((hint) => rowText.includes(hint))) {
      return sourceType;
    }
  }

  return null;
}

function inferErrorType(row: KnowledgeRow, currentErrorType: string) {
  const rowText = buildRowText(row);

  if (
    currentErrorType &&
    (rowText.includes(currentErrorType) ||
      (ERROR_TYPE_HINTS[currentErrorType] ?? []).some((term) => rowText.includes(term)))
  ) {
    return currentErrorType;
  }

  for (const [errorType, hints] of Object.entries(ERROR_TYPE_HINTS)) {
    if (hints.some((term) => rowText.includes(term))) {
      return errorType;
    }
  }

  return null;
}

function toRankedRetrievedCase(params: {
  row: KnowledgeRow;
  errorType: string;
  rankScore: number;
  sourceAligned: boolean;
  similarityScore: number | null;
}) {
  const source = params.row.source || params.row.category || "knowledge_base";

  return {
    title: params.row.title,
    errorType: inferErrorType(params.row, params.errorType),
    similarityScore: params.similarityScore,
    rootCause: params.row.possible_cause,
    repairSuggestion: params.row.solution,
    sourceType: inferSourceType(params.row),
    summary: buildKnowledgeSummary(params.row),
    source,
    rankScore: params.rankScore,
    sourceAligned: params.sourceAligned,
    dedupeKey: `${params.row.title.toLowerCase()}::${source.toLowerCase()}`,
  } satisfies RankedRetrievedCase;
}

function mergeRetrievedCases(...groups: RankedRetrievedCase[][]) {
  const merged = new Map<string, RankedRetrievedCase>();

  for (const items of groups) {
    for (const item of items) {
      const existing = merged.get(item.dedupeKey);

      if (!existing) {
        merged.set(item.dedupeKey, item);
        continue;
      }

      merged.set(item.dedupeKey, {
        ...existing,
        errorType: existing.errorType ?? item.errorType,
        similarityScore: Math.max(existing.similarityScore ?? 0, item.similarityScore ?? 0) || null,
        rootCause: existing.rootCause ?? item.rootCause,
        repairSuggestion: existing.repairSuggestion ?? item.repairSuggestion,
        sourceType: existing.sourceType ?? item.sourceType,
        summary: existing.summary.length >= item.summary.length ? existing.summary : item.summary,
        rankScore: Math.max(existing.rankScore, item.rankScore),
        sourceAligned: existing.sourceAligned || item.sourceAligned,
      });
    }
  }

  return Array.from(merged.values())
    .sort(
      (a, b) =>
        b.rankScore - a.rankScore ||
        Number(b.sourceAligned) - Number(a.sourceAligned) ||
        (b.similarityScore ?? 0) - (a.similarityScore ?? 0) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, MAX_CONTEXT_ITEMS);
}

function stripRetrievedCaseMetadata(item: RankedRetrievedCase): RagRetrievedCase {
  return {
    title: item.title,
    errorType: item.errorType,
    similarityScore: item.similarityScore,
    rootCause: item.rootCause,
    repairSuggestion: item.repairSuggestion,
    sourceType: item.sourceType,
    summary: item.summary,
    source: item.source,
  };
}

function toLegacyRagContextItem(item: RankedRetrievedCase): RagContextItem {
  return {
    title: item.title,
    summary: item.summary,
    source: item.source,
    score: item.rankScore,
  };
}

async function resolveKeywordKnowledgeCases(
  supabase: SupabaseServerClient,
  queryTerms: QueryTerms,
) {
  const { searchTerms, scoringTerms, phrases, rawText, sourceType, errorType, ruleName } = queryTerms;

  if (searchTerms.length === 0) {
    return [] as RankedRetrievedCase[];
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
    return [] as RankedRetrievedCase[];
  }

  const isGenericError = errorType === "generic_error";
  const isStrictErrorType = STRICT_ERROR_TYPES.has(errorType);

  return (data as KnowledgeRow[])
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

      return {
        row,
        lexicalScore,
        sourceAligned,
      };
    })
    .filter((item) => {
      if (isGenericError) {
        return item.sourceAligned && item.lexicalScore >= MIN_GENERIC_KEYWORD_SCORE;
      }

      if (item.lexicalScore < MIN_KEYWORD_SCORE) {
        return false;
      }

      if (isStrictErrorType) {
        return item.sourceAligned && item.lexicalScore >= MIN_KEYWORD_SCORE + 6;
      }

      return item.sourceAligned || item.lexicalScore >= MIN_KEYWORD_SCORE + 4;
    })
    .sort(
      (a, b) =>
        Number(b.sourceAligned) - Number(a.sourceAligned) ||
        b.lexicalScore - a.lexicalScore ||
        a.row.title.localeCompare(b.row.title),
    )
    .slice(0, MAX_CONTEXT_ITEMS)
    .map(({ row, lexicalScore, sourceAligned }) =>
      toRankedRetrievedCase({
        row,
        errorType,
        rankScore: lexicalScore + (sourceAligned ? 4 : 0),
        sourceAligned,
        similarityScore: null,
      }),
    );
}

async function resolveVectorKnowledgeCases(
  supabase: SupabaseServerClient,
  input: IncidentAnalysisInput,
  queryTerms: QueryTerms,
) {
  if (!hasEmbeddingConfig()) {
    return [] as RankedRetrievedCase[];
  }

  const { scoringTerms, phrases, rawText, sourceType, errorType, ruleName } = queryTerms;
  const embeddingInput = buildEmbeddingInput(
    [input.sourceType, input.incident.ruleName, input.incident.errorType, input.incident.rawText],
    { maxLength: MAX_EMBEDDING_INPUT_LENGTH },
  );
  const embedding = await embedText(embeddingInput);

  if (!embedding) {
    return [] as RankedRetrievedCase[];
  }

  const { data, error } = await supabase.rpc("match_knowledge_base", {
    query_embedding: embedding,
    match_count: MAX_DB_ROWS,
  });

  if (error || !data) {
    return [] as RankedRetrievedCase[];
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
    .map(({ row, combinedScore, sourceAligned, similarity }) =>
      toRankedRetrievedCase({
        row,
        errorType,
        rankScore: combinedScore,
        sourceAligned,
        similarityScore: similarity,
      }),
    );
}

export async function resolveHistoricalMissedCaseCandidates(
  input: IncidentAnalysisInput,
): Promise<RagRetrievedCase[]> {
  if (!hasSupabaseEnv() || !hasEmbeddingConfig()) {
    return [];
  }

  const supabase = await createClient();
  const embeddingInput = buildEmbeddingInput(
    [input.sourceType, input.incident.errorType, input.incident.ruleName, input.incident.rawText],
    { maxLength: MAX_EMBEDDING_INPUT_LENGTH },
  );
  const embedding = await embedText(embeddingInput);

  if (!embedding) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_historical_missed_cases", {
    query_embedding: embedding,
    match_count: MAX_CONTEXT_ITEMS,
    source_type_filter: normalizeText(input.sourceType) || null,
  });

  if (error || !data) {
    return [];
  }

  return (data as HistoricalMissedCaseRow[]).map((row) => ({
    title: row.title,
    errorType: row.error_type,
    similarityScore: row.similarity,
    rootCause: row.root_cause,
    repairSuggestion: row.repair_suggestion,
    sourceType: row.source_type,
    summary: [row.root_cause, row.repair_suggestion].filter(Boolean).join(" / "),
    source: row.source || "historical_missed_cases",
  }));
}

export async function resolveRagResult(input: IncidentAnalysisInput): Promise<RagResult> {
  const queryTerms = buildQueryTerms(input);
  const incidentId = typeof (input.incident as { incidentId?: unknown }).incidentId === "string"
    ? ((input.incident as { incidentId?: string }).incidentId ?? "")
    : "";

  if (!hasSupabaseEnv()) {
    return {
      incidentId,
      querySummary: buildQuerySummary(queryTerms),
      retrievedCases: [],
    };
  }

  const supabase = await createClient();
  const [keywordCases, vectorCases] = await Promise.all([
    resolveKeywordKnowledgeCases(supabase, queryTerms),
    resolveVectorKnowledgeCases(supabase, input, queryTerms),
  ]);

  const retrievedCases = mergeRetrievedCases(keywordCases, vectorCases).map(stripRetrievedCaseMetadata);

  return {
    incidentId,
    querySummary: buildQuerySummary(queryTerms),
    retrievedCases,
  };
}

export async function resolveKnowledgeBaseContext(
  input: IncidentAnalysisInput,
): Promise<RagContextItem[]> {
  const queryTerms = buildQueryTerms(input);

  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const [keywordCases, vectorCases] = await Promise.all([
    resolveKeywordKnowledgeCases(supabase, queryTerms),
    resolveVectorKnowledgeCases(supabase, input, queryTerms),
  ]);

  return mergeRetrievedCases(keywordCases, vectorCases).map(toLegacyRagContextItem);
}
