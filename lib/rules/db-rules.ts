import { createClient } from "@/lib/supabase/server-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  normalizeErrorType,
  normalizeMatchType,
  normalizeRiskLevel,
  normalizeRuleCategory,
} from "@/lib/rules/taxonomy";
import type { DetectionRule } from "@/lib/rules/types";

type DetectionRuleRow = {
  id: string;
  template_rule_id?: string | null;
  name: string;
  description: string | null;
  rule_category?: string | null;
  pattern: string;
  match_type: string;
  flags: string | null;
  error_type: string;
  risk_level: string;
  source_types: string[] | null;
  sub_tags?: string[] | null;
  source?: string | null;
  scenario?: string | null;
  example_log?: string | null;
  notes?: string | null;
  enabled: boolean;
};

function mapRowToRule(row: DetectionRuleRow): DetectionRule {
  const normalizedErrorType = normalizeErrorType(row.error_type, row.sub_tags ?? []);

  return {
    id: row.id,
    templateRuleId: row.template_rule_id ?? undefined,
    name: row.name,
    description: row.description ?? "",
    ruleCategory: normalizeRuleCategory(row.rule_category),
    pattern: row.pattern,
    matchType: normalizeMatchType(row.match_type),
    flags: row.flags ?? undefined,
    errorType: normalizedErrorType.errorType,
    riskLevel: normalizeRiskLevel(row.risk_level),
    sourceTypes: row.source_types ?? undefined,
    subTags: normalizedErrorType.subTags,
    source: row.source ?? undefined,
    scenario: row.scenario ?? undefined,
    exampleLog: row.example_log ?? undefined,
    notes: row.notes ?? undefined,
    enabled: row.enabled,
  };
}

async function selectExtendedRules() {
  const supabase = await createClient();
  const result = await supabase
    .from("detection_rules")
    .select(
      "id, template_rule_id, name, description, rule_category, pattern, match_type, flags, error_type, risk_level, source_types, sub_tags, source, scenario, example_log, notes, enabled",
    )
    .eq("enabled", true);

  if (!result.error) {
    return result;
  }

  const fallback = await supabase
    .from("detection_rules")
    .select(
      "id, name, description, pattern, match_type, flags, error_type, risk_level, source_types, enabled",
    )
    .eq("enabled", true);

  return fallback;
}

export async function getDynamicDetectionRules() {
  if (!hasSupabaseEnv()) {
    return [] as DetectionRule[];
  }

  const { data, error } = await selectExtendedRules();

  if (error || !data) {
    return [] as DetectionRule[];
  }

  return data.map((row) => mapRowToRule(row as DetectionRuleRow));
}
