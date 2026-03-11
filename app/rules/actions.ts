"use server";

import { encodedRedirect } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

function getTrimmedValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseSourceTypes(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function createDetectionRuleAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard", "Supabase is not configured.");
  }

  const name = getTrimmedValue(formData, "name");
  const description = getTrimmedValue(formData, "description");
  const pattern = getTrimmedValue(formData, "pattern");
  const matchTypeValue = getTrimmedValue(formData, "matchType");
  const flags = getTrimmedValue(formData, "flags");
  const errorType = getTrimmedValue(formData, "errorType");
  const riskLevelValue = getTrimmedValue(formData, "riskLevel");
  const sourceTypes = parseSourceTypes(getTrimmedValue(formData, "sourceTypes"));

  if (!name || !pattern || !errorType) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "Rule name, pattern, and error type are required.",
    );
  }

  const matchType = matchTypeValue === "regex" ? "regex" : "keyword";
  const riskLevel =
    riskLevelValue === "low" || riskLevelValue === "high"
      ? riskLevelValue
      : "medium";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "Please sign in before creating rules.");
  }

  const { error } = await supabase.from("detection_rules").insert({
    name,
    description: description || null,
    pattern,
    match_type: matchType,
    flags: flags || null,
    error_type: errorType,
    risk_level: riskLevel,
    source_types: sourceTypes,
    enabled: true,
    created_by: user.id,
  });

  if (error) {
    return encodedRedirect("error", "/dashboard", error.message);
  }

  return encodedRedirect("success", "/dashboard", `Rule "${name}" was created successfully.`);
}
