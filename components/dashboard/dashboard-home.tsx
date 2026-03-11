import Link from "next/link";
import { SubmitButton } from "@/components/auth/submit-button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ModeComparison } from "@/components/dashboard/mode-comparison";
import { RingChart } from "@/components/dashboard/ring-chart";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { signOutAction } from "@/app/auth/actions";
import { createLogUploadAction } from "@/app/logs/actions";
import {
  integrationPoints,
  logIncidents,
  metrics,
  modeComparisons,
  modes,
  repairSuggestions,
  riskBreakdown,
  timelineSteps,
  typeBreakdown,
} from "@/lib/dashboard-data";

type DashboardHomeProps = {
  userEmail: string;
  teamName: string | null;
  status?: string;
  message?: string;
  recentLogs: {
    id: string;
    fileName: string;
    sourceType: string;
    analysisMode: string;
    status: string;
    fileSize: number;
    lineCount: number;
    uploadedAt: string;
  }[];
};

export function DashboardHome({
  userEmail,
  teamName,
  status,
  message,
  recentLogs,
}: DashboardHomeProps) {
  const tone =
    status === "error" ? "danger" : status === "success" ? "success" : "info";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_#07111f_0%,_#0b1728_55%,_#09131f_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8 lg:px-10">
        <section className="rounded-[32px] border border-white/10 bg-white/6 p-4 shadow-[0_20px_70px_rgba(3,9,20,0.32)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.95),_rgba(250,204,21,0.92))] text-sm font-bold text-slate-950">
                LA
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                  Authenticated Session
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  已进入智能日志分析工作台
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  当前账号：{userEmail}
                  {teamName ? ` · 团队：${teamName}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusPill label="Supabase Session Active" tone="success" />
              <Link
                href="/"
                className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
              >
                返回登录页
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  退出登录
                </button>
              </form>
            </div>
          </div>
        </section>

        {message ? (
          <section className="rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_55px_rgba(2,8,18,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Dashboard Status</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
              </div>
              <StatusPill label={status ?? "info"} tone={tone} />
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/6 shadow-[0_24px_80px_rgba(3,9,20,0.35)] backdrop-blur">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-cyan-200/80">
                <StatusPill label="Frontend Skeleton" tone="info" />
                <span>Next.js App Router</span>
                <span>Supabase / LLM / RAG Ready</span>
              </div>
              <div className="max-w-3xl space-y-4">
                <p className="text-sm font-medium text-cyan-200/90">
                  智能日志分析与运维辅助决策系统
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  先把日志看见，再把异常解释清楚。
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  当前版本为前端骨架演示页，已经把日志上传、分析模式、异常总览、
                  风险结构、模式对比、异常明细和修复建议这些核心区域搭好，后续只需要把
                  Supabase、规则引擎、RAG 和大模型接口接进来。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  选择日志文件
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-200/70 hover:bg-white/6"
                >
                  查看分析流程
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              <SectionCard
                eyebrow="Upload Console"
                title="日志接入区"
                description="现在已经接到真实 logs 表，上传后会写入 Supabase。"
              >
                <form action={createLogUploadAction} className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">
                      选择日志文件
                    </span>
                    <input
                      name="logFile"
                      type="file"
                      accept=".log,.txt,.json,.out,.csv,text/plain,application/json"
                      className="w-full rounded-2xl border border-dashed border-cyan-200/30 bg-slate-950/45 px-4 py-4 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                    />
                  </label>
                  <div className="grid gap-3 text-sm text-slate-300">
                    <label className="space-y-2">
                      <span className="block text-sm font-medium text-slate-200">
                        日志来源
                      </span>
                      <select
                        name="sourceType"
                        defaultValue="nginx"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="nginx">Nginx</option>
                        <option value="system">System</option>
                        <option value="postgres">Postgres</option>
                        <option value="application">Application</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="block text-sm font-medium text-slate-200">
                        分析模式
                      </span>
                      <select
                        name="analysisMode"
                        defaultValue="hybrid"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="hybrid">Hybrid</option>
                        <option value="rule_only">Rule Only</option>
                        <option value="model_only">Model Only</option>
                      </select>
                    </label>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3 text-xs leading-6 text-slate-400">
                    当前会先写入日志元数据到 `logs` 表。后续再接 Supabase Storage、
                    规则检测和分析任务流。
                  </div>
                  <SubmitButton
                    idleText="上传并登记日志"
                    pendingText="正在写入 logs..."
                    className="w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  />
                </form>
              </SectionCard>

              <SectionCard
                eyebrow="Analysis Modes"
                title="分析模式"
                description="保留 PRD 中要求的三种模式，默认突出 Hybrid。"
              >
                <div className="space-y-3">
                  {modes.map((mode) => (
                    <div
                      key={mode.name}
                      className={`rounded-2xl border px-4 py-4 transition ${
                        mode.active
                          ? "border-cyan-300/60 bg-cyan-300/10"
                          : "border-white/10 bg-white/4"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {mode.name}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-slate-400">
                            {mode.description}
                          </p>
                        </div>
                        <StatusPill
                          label={mode.active ? "默认" : "可切换"}
                          tone={mode.active ? "success" : "neutral"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            eyebrow="Uploads"
            title="最近上传"
            description="这些记录已经来自 Supabase logs 表，而不是静态假数据。"
          >
            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
                  还没有上传记录。先上传一份日志，确认数据库写入链路已经打通。
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {log.fileName}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-400">
                          {log.sourceType} · {log.analysisMode} ·{" "}
                          {formatBytes(log.fileSize)} · {log.lineCount} lines
                        </p>
                      </div>
                      <StatusPill label={log.status} tone="info" />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {formatTimestamp(log.uploadedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Pipeline"
            title="分析流程"
            description="前端先展示流程链路，后续把各步骤状态接到真实任务执行记录。"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {timelineSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-white/8 bg-slate-950/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                      Step {index + 1}
                    </span>
                    <StatusPill label={step.status} tone={step.tone} />
                  </div>
                  <p className="mt-4 text-base font-semibold text-white">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Integration"
            title="接口预留"
            description="这些位置先在页面上明确，后面接真实 API 时不会反复改结构。"
          >
            <div className="space-y-3">
              {integrationPoints.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-slate-400">
                        {item.description}
                      </p>
                    </div>
                    <code className="rounded-full bg-slate-950/70 px-3 py-1 text-xs text-cyan-200">
                      {item.endpoint}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_1fr]">
          <SectionCard
            eyebrow="Overview"
            title="异常类型分布"
            description="后续可替换为 Recharts 柱状图，当前先用静态条形布局确定空间。"
          >
            <div className="space-y-4">
              {typeBreakdown.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="font-semibold text-white">
                      {item.value}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,_rgba(34,211,238,0.95),_rgba(250,204,21,0.95))]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Risk"
            title="风险等级结构"
            description="高风险事件优先突出，低置信度结果后续会叠加 Uncertain 标记。"
          >
            <div className="grid items-center gap-6 md:grid-cols-[180px_1fr]">
              <RingChart segments={riskBreakdown} />
              <div className="space-y-3">
                {riskBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-300">{item.label}</span>
                    </div>
                    <span className="font-semibold text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Experiment"
            title="模式对比"
            description="保留 PRD 中的实验视角，后续直接绑定统计数据。"
          >
            <ModeComparison items={modeComparisons} />
          </SectionCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            eyebrow="Incidents"
            title="异常详情"
            description="后续可以替换成可分页、可筛选、可人工复核的异常明细表。"
          >
            <div className="overflow-hidden rounded-3xl border border-white/8">
              <div className="grid grid-cols-[1.1fr_0.9fr_0.5fr_0.7fr] gap-3 bg-white/7 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>日志片段</span>
                <span>原因判断</span>
                <span>风险</span>
                <span>置信度</span>
              </div>
              <div className="divide-y divide-white/6 bg-slate-950/35">
                {logIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="grid grid-cols-[1.1fr_0.9fr_0.5fr_0.7fr] gap-3 px-4 py-4 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{incident.message}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {incident.source}
                      </p>
                    </div>
                    <p className="text-slate-300">{incident.cause}</p>
                    <div>
                      <StatusPill label={incident.risk} tone={incident.tone} />
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {incident.confidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Actions"
            title="修复建议与人工复核"
            description="这里会承接大模型输出、知识库命中结果和人工备注。"
          >
            <div className="space-y-3">
              {repairSuggestions.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/8 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-slate-400">
                        {item.detail}
                      </p>
                    </div>
                    <StatusPill label={item.tag} tone={item.tone} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}

function formatBytes(value: number) {
  if (!value) {
    return "0 B";
  }

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
  if (!value) {
    return "No upload time";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
