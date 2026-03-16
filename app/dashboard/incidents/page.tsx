import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

export default async function DashboardIncidentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const userId = profile.userId;

  const errorsResult = userId
    ? await supabase
        .from("log_errors")
        .select("id, log_id, raw_text, error_type, detected_by, line_number, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const errors = errorsResult.data ?? [];
  const logIds = Array.from(new Set(errors.map((item) => item.log_id).filter(Boolean)));
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
        eyebrow="Incidents"
        title="异常命中明细"
        description="这里展示规则层命中的异常片段。可以继续查看原始日志详情，或进入人工复核。"
      >
        <div className="space-y-3">
          {errors.length === 0 ? (
            <EmptyState text="暂无异常命中记录。" />
          ) : (
            errors.map((error) => (
              <div key={error.id} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={formatErrorType(error.error_type ?? "unknown")} tone="warning" />
                      <StatusPill label={error.detected_by ?? "rule"} tone="info" />
                      <span className="text-xs text-slate-500">第 {error.line_number ?? 0} 行</span>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {logNameById.get(error.log_id ?? "") ?? "未知日志"}
                    </p>
                    <p className="font-mono text-sm leading-6 text-slate-200">{error.raw_text}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <p className="text-xs text-slate-500">{formatTimestamp(error.created_at ?? "")}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/dashboard/logs/${error.log_id}`}
                        className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
                      >
                        查看原日志
                      </Link>
                      <Link
                        href={`/dashboard/reviews?logId=${encodeURIComponent(error.log_id ?? "")}`}
                        className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-amber-300/60 hover:bg-white/6"
                      >
                        进入复核
                      </Link>
                    </div>
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

function formatErrorType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
