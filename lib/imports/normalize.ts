import type {
  NormalizedKnowledgeImport,
  NormalizedRuleImport,
} from "@/lib/imports/types";

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asTrimmedString(value);
  return text ? text : null;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => asTrimmedString(item))
      .filter(Boolean)
      .map((item) => item.toLowerCase());
  }

  const text = asTrimmedString(value);
  if (!text) {
    return [] as string[];
  }

  return text
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getFirstValue<T extends string>(row: PlainObject, keys: T[]) {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }
  return undefined;
}

function parseJsonArray(payload: string) {
  const text = payload.trim();
  if (!text) {
    throw new Error("请先粘贴 JSON 数组内容。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON 格式不正确，请检查逗号、引号和括号。");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("导入内容必须是 JSON 数组。");
  }

  return parsed;
}

export function parseRuleImportPayload(payload: string) {
  const rows = parseJsonArray(payload);
  const items: NormalizedRuleImport[] = [];

  rows.forEach((row, index) => {
    if (!isPlainObject(row)) {
      throw new Error(`第 ${index + 1} 条规则不是对象。`);
    }

    const name = asTrimmedString(getFirstValue(row, ["name", "title", "rule_name"]));
    const pattern = asTrimmedString(getFirstValue(row, ["pattern", "match", "expression"]));
    const errorType = asTrimmedString(
      getFirstValue(row, ["errorType", "error_type", "category"]),
    );

    if (!name || !pattern || !errorType) {
      throw new Error(`第 ${index + 1} 条规则缺少 name、pattern 或 errorType。`);
    }

    const matchTypeValue = asTrimmedString(
      getFirstValue(row, ["matchType", "match_type", "type"]),
    ).toLowerCase();
    const riskLevelValue = asTrimmedString(
      getFirstValue(row, ["riskLevel", "risk_level", "severity"]),
    ).toLowerCase();

    items.push({
      name,
      description: asNullableString(getFirstValue(row, ["description", "desc"])),
      pattern,
      matchType: matchTypeValue === "regex" ? "regex" : "keyword",
      flags: asNullableString(getFirstValue(row, ["flags", "regexFlags", "regex_flags"])),
      errorType: errorType.toLowerCase().replace(/\s+/g, "_"),
      riskLevel:
        riskLevelValue === "low" || riskLevelValue === "high"
          ? riskLevelValue
          : "medium",
      sourceTypes: asStringArray(
        getFirstValue(row, ["sourceTypes", "source_types", "sources"]),
      ),
      enabled: getFirstValue(row, ["enabled"]) === false ? false : true,
    });
  });

  return items;
}

export function parseKnowledgeImportPayload(payload: string) {
  const rows = parseJsonArray(payload);
  const items: NormalizedKnowledgeImport[] = [];

  rows.forEach((row, index) => {
    if (!isPlainObject(row)) {
      throw new Error(`第 ${index + 1} 条知识不是对象。`);
    }

    const title = asTrimmedString(getFirstValue(row, ["title", "name"]));
    const solution = asNullableString(getFirstValue(row, ["solution", "resolution", "fix"]));
    const symptom = asNullableString(getFirstValue(row, ["symptom", "issue", "problem"]));

    if (!title) {
      throw new Error(`第 ${index + 1} 条知识缺少 title。`);
    }

    items.push({
      title,
      category: asNullableString(getFirstValue(row, ["category", "type"])),
      keywords: asNullableString(getFirstValue(row, ["keywords", "tags"])),
      symptom,
      possibleCause: asNullableString(
        getFirstValue(row, ["possibleCause", "possible_cause", "cause"]),
      ),
      solution,
      source: asNullableString(getFirstValue(row, ["source", "origin"])),
    });
  });

  return items;
}

export function buildRuleFingerprint(item: NormalizedRuleImport) {
  return [
    item.name.trim().toLowerCase(),
    item.pattern.trim().toLowerCase(),
    item.errorType.trim().toLowerCase(),
  ].join("::");
}

export function buildKnowledgeFingerprint(item: NormalizedKnowledgeImport) {
  return [
    item.title.trim().toLowerCase(),
    (item.symptom ?? "").trim().toLowerCase(),
    (item.solution ?? "").trim().toLowerCase(),
  ].join("::");
}
