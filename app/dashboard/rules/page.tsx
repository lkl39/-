import { RulesCenter } from "@/components/dashboard/rules-center";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { defaultDetectionRules } from "@/lib/rules/default-rules";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

type DashboardRulesPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function DashboardRulesPage({
  searchParams,
}: DashboardRulesPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: dynamicRules } = await supabase
    .from("detection_rules")
    .select(
      "id, name, pattern, match_type, error_type, risk_level, source_types, enabled, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(30);

  return (
    <DashboardShell
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      activeView="rules"
    >
      <RulesCenter
        status={params.status}
        message={params.message}
        defaultRuleCount={defaultDetectionRules.length}
        dynamicRules={(dynamicRules ?? []).map((rule) => ({
          id: rule.id,
          name: rule.name,
          pattern: rule.pattern,
          matchType: rule.match_type ?? "keyword",
          errorType: rule.error_type,
          riskLevel: rule.risk_level ?? "medium",
          sourceTypes: rule.source_types ?? [],
          enabled: rule.enabled ?? true,
          updatedAt: rule.updated_at ?? "",
        }))}
      />
    </DashboardShell>
  );
}
