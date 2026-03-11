import { createClient } from "@/lib/supabase/server-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { DetectionRule } from "@/lib/rules/types";

type DetectionRuleRow = {
  id: string;
  name: string;
  description: string | null;
  pattern: string;
  match_type: string;
  flags: string | null;
  error_type: string;
  risk_level: string;
  source_types: string[] | null;
  enabled: boolean;
};

function isMatchType(value: string): value is DetectionRule["matchType"] {
  return value === "keyword" || value === "regex";
}

function isRiskLevel(
  value: string,
): value is DetectionRule["riskLevel"] {
  return value === "low" || value === "medium" || value === "high";
}

function mapRowToRule(row: DetectionRuleRow): DetectionRule | null {
  if (!isMatchType(row.match_type) || !isRiskLevel(row.risk_level)) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    pattern: row.pattern,
    matchType: row.match_type,
    flags: row.flags ?? undefined,
    errorType: row.error_type,
    riskLevel: row.risk_level,
    sourceTypes: row.source_types ?? undefined,
    enabled: row.enabled,
  };
}

export async function getDynamicDetectionRules() {
  if (!hasSupabaseEnv()) {
    return [] as DetectionRule[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detection_rules")
    .select(
      "id, name, description, pattern, match_type, flags, error_type, risk_level, source_types, enabled",
    )
    .eq("enabled", true);

  // Keep uploads stable even before the extension tables are created.
  if (error || !data) {
    return [] as DetectionRule[];
  }

  return data
    .map((row) => mapRowToRule(row as DetectionRuleRow))
    .filter((rule): rule is DetectionRule => rule !== null);
}
