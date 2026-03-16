import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

export default async function DashboardAnalysesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const userId = profile.userId;

  const analysesResult = userId
    ? await supabase
        .from("analysis_results")
        .select("id, log_id, cause, risk_level, confidence, repair_suggestion, model_name, analysis_mode, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const analyses = analysesResult.data ?? [];
  const logIds = Array.from(new Set(analyses.map((item) => item.log_id).filter(Boolean)));
  const logsResult =
    userId && logIds.length > 0
      ? await supabase.from("logs").select("id, file_name").eq("user_id", userId).in("id", logIds)
      : { data: [] };
  const logNameById = new Map((logsResult.data ?? []).map((item) => [item.id, item.file_name ?? "未知日志"]));

  return (
    <DashboardShell
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      activeView="overview"
    >
      <SectionCard
        eyebrow="Analysis"
        title="已完成分析结果"
        description="这里汇总展示全部分析输出，适合快速回看原因判断、风险等级和修复建议。"
      >
        <div className="space-y-3">
          {analyses.length === 0 ? (
            <EmptyState text="暂无分析结果。上传并分析日志后，这里会自动出现记录。" />
          ) : (
            analyses.map((analysis) => (
              <div key={analysis.id} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={getRiskLabel(analysis.risk_level ?? "medium")} tone={getRiskTone(analysis.risk_level ?? "medium")} />
                      <StatusPill label={analysis.analysis_mode ?? "hybrid"} tone="info" />
                      <StatusPill label={analysis.model_name ?? "rule-engine-v1"} tone="neutral" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {logNameById.get(analysis.log_id ?? "") ?? "未知日志"}
                    </p>
                    <p className="text-sm leading-6 text-white">{analysis.cause ?? "暂无原因说明"}</p>
                    <p className="text-sm leading-6 text-slate-300">{analysis.repair_suggestion ?? "暂无处理建议"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <p className="text-sm font-semibold text-cyan-200">置信度 {formatConfidence(analysis.confidence)}</p>
                    <p className="text-xs text-slate-500">{formatTimestamp(analysis.created_at ?? "")}</p>
                    <Link
                      href={`/dashboard/logs/${analysis.log_id}`}
                      className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
                    >
                      查看详情
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </DashboardShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function formatTimestamp(value: string) {
  if (!value) return "暂无时间";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatConfidence(value: number | string | null) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
}

function getRiskTone(riskLevel: string) {
  if (riskLevel === "high") return "danger";
  if (riskLevel === "low") return "success";
  return "warning";
}

function getRiskLabel(riskLevel: string) {
  if (riskLevel === "high") return "高风险";
  if (riskLevel === "low") return "低风险";
  return "中风险";
}
