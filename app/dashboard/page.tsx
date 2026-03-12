import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { modeBenchmarks } from "@/lib/dashboard/benchmarks";
import { buildErrorTypeChart, buildRiskChart } from "@/lib/dashboard/overview";
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
  const userId = profile.userId;

  const [
    logsCountResult,
    errorsCountResult,
    highRiskCountResult,
    dynamicRulesCountResult,
    logsFeedResult,
    errorsFeedResult,
    analysesFeedResult,
  ] = userId
    ? await Promise.all([
        supabase
          .from("logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("log_errors")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("analysis_results")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("risk_level", "high"),
        supabase
          .from("detection_rules")
          .select("*", { count: "exact", head: true })
          .eq("enabled", true),
        supabase
          .from("logs")
          .select(
            "id, file_name, source_type, analysis_mode, status, file_size, line_count, uploaded_at",
          )
          .eq("user_id", userId)
          .order("uploaded_at", { ascending: false })
          .limit(40),
        supabase
          .from("log_errors")
          .select("id, raw_text, error_type, detected_by, line_number, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("analysis_results")
          .select(
            "id, cause, risk_level, confidence, repair_suggestion, model_name, analysis_mode, created_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(80),
      ])
    : [
        { count: 0 },
        { count: 0 },
        { count: 0 },
        { count: 0 },
        { data: [] },
        { data: [] },
        { data: [] },
      ];

  const recentLogs = logsFeedResult.data ?? [];
  const recentErrors = errorsFeedResult.data ?? [];
  const recentAnalyses = analysesFeedResult.data ?? [];
  const metrics = [
    {
      label: "日志任务",
      value: `${logsCountResult.count ?? 0}`,
      hint: "当前用户累计上传任务",
      tone: "info" as const,
    },
    {
      label: "异常命中",
      value: `${errorsCountResult.count ?? 0}`,
      hint: "规则层累计识别异常",
      tone: "warning" as const,
    },
    {
      label: "高风险分析",
      value: `${highRiskCountResult.count ?? 0}`,
      hint: "需要优先处理的分析结果",
      tone: "danger" as const,
    },
    {
      label: "生效规则",
      value: `${dynamicRulesCountResult.count ?? 0}`,
      hint: "当前启用的动态规则数",
      tone: "success" as const,
    },
  ];

  return (
    <DashboardShell
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      activeView="overview"
    >
      <DashboardOverview
        status={params.status}
        message={params.message}
        metrics={metrics}
        typeBreakdown={buildErrorTypeChart(recentErrors)}
        riskBreakdown={buildRiskChart(recentAnalyses)}
        modeComparison={modeBenchmarks}
        recentLogs={recentLogs.slice(0, 6).map((log) => ({
          id: log.id,
          fileName: log.file_name,
          sourceType: log.source_type ?? "unknown",
          analysisMode: log.analysis_mode,
          status: log.status,
          fileSize: log.file_size ?? 0,
          lineCount: log.line_count ?? 0,
          uploadedAt: log.uploaded_at ?? "",
        }))}
        recentErrors={recentErrors.slice(0, 10).map((error) => ({
          id: error.id,
          rawText: error.raw_text,
          errorType: error.error_type ?? "unknown",
          detectedBy: error.detected_by ?? "rule",
          lineNumber: error.line_number ?? 0,
          createdAt: error.created_at ?? "",
        }))}
        recentAnalyses={recentAnalyses.slice(0, 8).map((analysis) => ({
          id: analysis.id,
          cause: analysis.cause ?? "",
          riskLevel: analysis.risk_level ?? "medium",
          confidence:
            typeof analysis.confidence === "number"
              ? analysis.confidence
              : Number(analysis.confidence ?? 0),
          repairSuggestion: analysis.repair_suggestion ?? "",
          modelName: analysis.model_name ?? "rule-engine-v1",
          analysisMode: analysis.analysis_mode ?? "hybrid",
          createdAt: analysis.created_at ?? "",
        }))}
      />
    </DashboardShell>
  );
}
