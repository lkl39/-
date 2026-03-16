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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const userId = profile.userId;

  const [
    logsCountResult,
    errorsCountResult,
    highRiskCountResult,
    analysesCountResult,
    errorsFeedResult,
    analysesFeedResult,
  ] = userId
    ? await Promise.all([
        supabase.from("logs").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("log_errors").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("analysis_results")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("risk_level", "high"),
        supabase.from("analysis_results").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("log_errors")
          .select("id, raw_text, error_type, detected_by, line_number, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("analysis_results")
          .select("id, cause, risk_level, confidence, repair_suggestion, model_name, analysis_mode, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(80),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { data: [] }, { data: [] }];

  const recentErrors = errorsFeedResult.data ?? [];
  const recentAnalyses = analysesFeedResult.data ?? [];

  const metrics = [
    {
      label: "日志任务总数",
      value: `${logsCountResult.count ?? 0}`,
      hint: "点击查看近期任务，并进入单次日志详情。",
      tone: "info" as const,
      href: "/dashboard/tasks",
    },
    {
      label: "异常命中总数",
      value: `${errorsCountResult.count ?? 0}`,
      hint: "点击查看系统命中的异常片段与定位信息。",
      tone: "warning" as const,
      href: "/dashboard/incidents",
    },
    {
      label: "高风险事件数",
      value: `${highRiskCountResult.count ?? 0}`,
      hint: "点击查看高风险分析结果和建议处理动作。",
      tone: "danger" as const,
      href: "/dashboard/high-risk",
    },
    {
      label: "已完成分析数",
      value: `${analysesCountResult.count ?? 0}`,
      hint: "点击查看全部已完成分析结果。",
      tone: "success" as const,
      href: "/dashboard/analyses",
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
      />
    </DashboardShell>
  );
}
