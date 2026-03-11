import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { defaultDetectionRules } from "@/lib/rules/default-rules";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

type DashboardPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: recentLogs } = profile.userId
    ? await supabase
        .from("logs")
        .select(
          "id, file_name, source_type, analysis_mode, status, file_size, line_count, uploaded_at",
        )
        .eq("user_id", profile.userId)
        .order("uploaded_at", { ascending: false })
        .limit(6)
    : { data: [] };
  const { data: recentErrors } = profile.userId
    ? await supabase
        .from("log_errors")
        .select("id, raw_text, error_type, detected_by, line_number, created_at")
        .eq("user_id", profile.userId)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };
  const { data: dynamicRules } = await supabase
    .from("detection_rules")
    .select(
      "id, name, pattern, match_type, error_type, risk_level, source_types, enabled, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(8);

  return (
    <DashboardHome
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      status={params.status}
      message={params.message}
      recentLogs={(recentLogs ?? []).map((log) => ({
        id: log.id,
        fileName: log.file_name,
        sourceType: log.source_type ?? "unknown",
        analysisMode: log.analysis_mode,
        status: log.status,
        fileSize: log.file_size ?? 0,
        lineCount: log.line_count ?? 0,
        uploadedAt: log.uploaded_at ?? "",
      }))}
      recentErrors={(recentErrors ?? []).map((error) => ({
        id: error.id,
        rawText: error.raw_text,
        errorType: error.error_type ?? "unknown",
        detectedBy: error.detected_by ?? "rule",
        lineNumber: error.line_number ?? 0,
        createdAt: error.created_at ?? "",
      }))}
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
  );
}
