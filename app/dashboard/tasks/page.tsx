import Link from "next/link";
import { deleteLogAction, updateLogMetadataAction } from "@/app/logs/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

type DashboardTasksPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

const RETENTION_DAYS = 30;

export default async function DashboardTasksPage({ searchParams }: DashboardTasksPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const userId = profile.userId;

  const logsResult = userId
    ? await supabase
        .from("logs")
        .select("id, file_name, source_type, analysis_mode, status, storage_path, file_size, line_count, uploaded_at")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const logs = logsResult.data ?? [];
  const tone = params.status === "error" ? "danger" : params.status === "success" ? "success" : "info";

  return (
    <DashboardShell
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      activeView="logs"
    >
      {params.message ? (
        <section className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_55px_rgba(2,8,18,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">数据管理提示</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{params.message}</p>
            </div>
            <StatusPill
              label={params.status === "success" ? "成功" : params.status === "error" ? "失败" : "提示"}
              tone={tone}
            />
          </div>
        </section>
      ) : null}

      <SectionCard
        eyebrow="Data Center"
        title="数据管理中心"
        description="统一管理你上传过的日志，支持查看详情、修改基础信息、删除日志，以及查看保留期限。"
      >
        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <SummaryCard label="日志总数" value={`${logs.length}`} />
          <SummaryCard label="保留期限" value={`${RETENTION_DAYS} 天`} />
          <SummaryCard label="管理能力" value="增删改查" />
        </div>

        <div className="space-y-4">
          {logs.length === 0 ? (
            <EmptyState text="还没有日志任务。先回到首页上传一份日志。" />
          ) : (
            logs.map((log) => {
              const retention = buildRetention(log.uploaded_at ?? "", RETENTION_DAYS);

              return (
                <div
                  key={log.id}
                  className="rounded-[28px] border border-white/8 bg-white/5 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{log.file_name}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-400">
                        {formatSource(log.source_type ?? "custom")} | {log.analysis_mode} | {formatBytes(log.file_size ?? 0)} | {(log.line_count ?? 0)} 行
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusPill label={getStatusLabel(log.status ?? "uploaded")} tone={getStatusTone(log.status ?? "uploaded")} />
                        <StatusPill label={`保留至 ${retention.deadlineLabel}`} tone={retention.tone} />
                        <StatusPill label={retention.remainingLabel} tone={retention.tone} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/logs/${log.id}`}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                      >
                        查看日志详情
                      </Link>
                      <Link
                        href={`/dashboard/reviews?logId=${encodeURIComponent(log.id)}`}
                        className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-300/60 hover:bg-white/6"
                      >
                        进入人工复核
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <form action={updateLogMetadataAction} className="rounded-3xl border border-white/8 bg-slate-950/30 p-4">
                      <input type="hidden" name="logId" value={log.id} />
                      <p className="text-sm font-semibold text-white">修改基础信息</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr_auto] md:items-end">
                        <label className="space-y-2">
                          <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">日志名称</span>
                          <input
                            name="fileName"
                            type="text"
                            defaultValue={log.file_name}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Source Type</span>
                          <select
                            name="sourceType"
                            defaultValue={log.source_type ?? "custom"}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500"
                          >
                            <option value="nginx">Nginx</option>
                            <option value="system">System</option>
                            <option value="postgres">PostgreSQL</option>
                            <option value="application">Application</option>
                            <option value="custom">Custom</option>
                          </select>
                        </label>
                        <button
                          type="submit"
                          className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                        >
                          保存修改
                        </button>
                      </div>
                    </form>

                    <div className="rounded-3xl border border-white/8 bg-slate-950/30 p-4">
                      <p className="text-sm font-semibold text-white">日志管理</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <p>上传时间：{formatTimestamp(log.uploaded_at ?? "")}</p>
                        <p>
                          Storage Path：<span className="break-all font-mono text-xs text-cyan-200">{log.storage_path ?? "无"}</span>
                        </p>
                      </div>
                      <form action={deleteLogAction} className="mt-4">
                        <input type="hidden" name="logId" value={log.id} />
                        <input type="hidden" name="storagePath" value={log.storage_path ?? ""} />
                        <button
                          type="submit"
                          className="rounded-2xl border border-rose-300/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/10"
                        >
                          删除日志
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SectionCard>
    </DashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatTimestamp(value: string) {
  if (!value) return "暂无时间";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSource(value: string) {
  if (value === "nginx") return "Nginx";
  if (value === "system") return "System";
  if (value === "postgres") return "PostgreSQL";
  if (value === "application") return "Application";
  return "Custom";
}

function getStatusTone(status: string) {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "warning";
  return "info";
}

function getStatusLabel(status: string) {
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "processing") return "处理中";
  return "已上传";
}

function buildRetention(uploadedAt: string, retentionDays: number) {
  if (!uploadedAt) {
    return {
      deadlineLabel: "未知",
      remainingLabel: "保留时间未知",
      tone: "warning" as const,
    };
  }

  const uploadDate = new Date(uploadedAt);
  const deadline = new Date(uploadDate);
  deadline.setDate(deadline.getDate() + retentionDays);

  const diff = deadline.getTime() - Date.now();
  const remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return {
    deadlineLabel: new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
    }).format(deadline),
    remainingLabel: remainingDays > 0 ? `剩余 ${remainingDays} 天` : "已到期待清理",
    tone: remainingDays > 7 ? "info" as const : remainingDays > 0 ? "warning" as const : "danger" as const,
  };
}
