import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { createLogUploadAction } from "@/app/logs/actions";
import { createDetectionRuleAction } from "@/app/rules/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";

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
  recentErrors: {
    id: string;
    rawText: string;
    errorType: string;
    detectedBy: string;
    lineNumber: number;
    createdAt: string;
  }[];
  defaultRuleCount: number;
  dynamicRules: {
    id: string;
    name: string;
    pattern: string;
    matchType: string;
    errorType: string;
    riskLevel: string;
    sourceTypes: string[];
    enabled: boolean;
    updatedAt: string;
  }[];
};

export function DashboardHome({
  userEmail,
  teamName,
  status,
  message,
  recentLogs,
  recentErrors,
  defaultRuleCount,
  dynamicRules,
}: DashboardHomeProps) {
  const tone =
    status === "error" ? "danger" : status === "success" ? "success" : "info";
  const enabledDynamicRuleCount = dynamicRules.filter((rule) => rule.enabled).length;
  const summaryCards = [
    {
      label: "最近上传",
      value: `${recentLogs.length}`,
      hint: "最近 6 次任务",
    },
    {
      label: "最近异常",
      value: `${recentErrors.length}`,
      hint: "最近 10 条命中",
    },
    {
      label: "内置规则",
      value: `${defaultRuleCount}`,
      hint: "代码默认规则集",
    },
    {
      label: "动态规则",
      value: `${enabledDynamicRuleCount}`,
      hint: "来自 detection_rules",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_#07111f_0%,_#0b1728_55%,_#09131f_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8 lg:px-10">
        <section className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_70px_rgba(3,9,20,0.32)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.95),_rgba(250,204,21,0.92))] text-sm font-bold text-slate-950">
                LA
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                  Authenticated Session
                </p>
                <h1 className="mt-1 text-xl font-semibold text-white">
                  智能日志分析与运维辅助决策台
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  当前账号：{userEmail}
                  {teamName ? ` · 团队：${teamName}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusPill label="Supabase Online" tone="success" />
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_18px_55px_rgba(2,8,18,0.3)]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
                {card.label}
              </p>
              <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
              <p className="mt-2 text-sm text-slate-400">{card.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            eyebrow="Upload"
            title="日志上传与规则检测"
            description="原始日志先进入 Supabase Storage，再写入 logs 表并触发第一层规则检测。"
          >
            <form action={createLogUploadAction} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">日志文件</span>
                <input
                  name="logFile"
                  type="file"
                  accept=".log,.txt,.json,.out,.csv,text/plain,application/json"
                  className="w-full rounded-2xl border border-dashed border-cyan-200/30 bg-slate-950/45 px-4 py-4 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
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
                当前上传链路已经稳定：Storage 落原始文件，`logs` 记录元数据，`log_errors`
                记录规则命中的异常片段。
              </div>
              <SubmitButton
                idleText="上传并分析日志"
                pendingText="正在上传并执行规则检测..."
                className="w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              />
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Rules"
            title="动态规则录入"
            description="这里写入 detection_rules。新规则会参与后续上传日志的第一层检测。"
          >
            <form action={createDetectionRuleAction} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-slate-200">
                    规则名称
                  </span>
                  <input
                    name="name"
                    type="text"
                    placeholder="例如：Billing Connection Refused"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-slate-200">
                    匹配类型
                  </span>
                  <select
                    name="matchType"
                    defaultValue="keyword"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="keyword">Keyword</option>
                    <option value="regex">Regex</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">匹配模式</span>
                <input
                  name="pattern"
                  type="text"
                  placeholder="例如：connection refused 或 \\b5\\d\\d\\b"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-slate-200">
                    异常类型
                  </span>
                  <input
                    name="errorType"
                    type="text"
                    placeholder="例如：connection_refused"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-slate-200">
                    风险等级
                  </span>
                  <select
                    name="riskLevel"
                    defaultValue="medium"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-slate-200">
                    Regex 标志
                  </span>
                  <input
                    name="flags"
                    type="text"
                    placeholder="例如：i"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  适用来源
                </span>
                <input
                  name="sourceTypes"
                  type="text"
                  placeholder="例如：nginx,application,custom"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">说明</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="记录该规则适用的典型场景，方便后续团队维护。"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <div className="rounded-2xl bg-white/5 px-4 py-3 text-xs leading-6 text-slate-400">
                建议先沉淀高频、稳定、重复出现的异常模式。低置信度或偶发问题，后续进入人工复核和候选规则更合理。
              </div>
              <SubmitButton
                idleText="保存动态规则"
                pendingText="正在写入 detection_rules..."
                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              />
            </form>
          </SectionCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            eyebrow="Logs"
            title="最近上传"
            description="这里展示真实的 logs 表数据，用来确认上传链路和任务状态。"
          >
            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <EmptyState text="还没有上传记录。先上传一份日志，确认 Storage 和 logs 写入都正常。" />
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{log.fileName}</p>
                        <p className="mt-1 text-xs leading-6 text-slate-400">
                          {log.sourceType} · {log.analysisMode} · {formatBytes(log.fileSize)} ·{" "}
                          {log.lineCount} lines
                        </p>
                      </div>
                      <StatusPill label={log.status} tone={getStatusTone(log.status)} />
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
            eyebrow="Rule Set"
            title="当前动态规则"
            description="这里只显示最近更新的动态规则。它们会和内置规则一起参与日志检测。"
          >
            <div className="space-y-3">
              {dynamicRules.length === 0 ? (
                <EmptyState text="还没有动态规则。你现在可以直接在左侧录入第一条团队规则。" />
              ) : (
                dynamicRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-3xl border border-white/8 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{rule.name}</p>
                          <StatusPill
                            label={rule.enabled ? "enabled" : "disabled"}
                            tone={rule.enabled ? "success" : "neutral"}
                          />
                          <StatusPill
                            label={rule.riskLevel}
                            tone={getRiskTone(rule.riskLevel)}
                          />
                        </div>
                        <p className="mt-2 break-all font-mono text-xs text-cyan-200">
                          {rule.pattern}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-slate-400">
                          {rule.matchType} · {rule.errorType}
                          {rule.sourceTypes.length > 0
                            ? ` · ${rule.sourceTypes.join(", ")}`
                            : " · all sources"}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatTimestamp(rule.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            eyebrow="Incidents"
            title="最近异常命中"
            description="这里展示真实的 log_errors 数据。下一步可以在这里继续接人工复核、候选规则和分析结果。"
          >
            <div className="overflow-hidden rounded-3xl border border-white/8">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.5fr] gap-3 bg-white/7 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>异常片段</span>
                <span>异常类型</span>
                <span>检测来源</span>
                <span>行号</span>
              </div>
              <div className="divide-y divide-white/6 bg-slate-950/35">
                {recentErrors.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    还没有规则命中的异常。可先上传一份包含 `error`、`failed`、`timeout` 或 `500`
                    的日志做测试。
                  </div>
                ) : (
                  recentErrors.map((error) => (
                    <div
                      key={error.id}
                      className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.5fr] gap-3 px-4 py-4 text-sm"
                    >
                      <div>
                        <p className="line-clamp-2 font-medium text-white">{error.rawText}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTimestamp(error.createdAt)}
                        </p>
                      </div>
                      <p className="text-slate-300">{error.errorType}</p>
                      <div>
                        <StatusPill label={error.detectedBy} tone="info" />
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {error.lineNumber || "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Next Step"
            title="后续闭环预留"
            description="你前面提到的稳定性要求，我已经按不会破坏现有链路的顺序预留好了。"
          >
            <div className="space-y-3">
              {[
                "规则未命中或模型低置信度时，进入 review_cases。",
                "人工确认后，可决定写入 rule_candidates 或 knowledge_base。",
                "detection_rules 只接收稳定、可复用的问题模式，避免规则库变脏。",
                "analysis_results 下一步再接，不会影响现在已跑通的上传与检测。",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
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
    return "No timestamp";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRiskTone(riskLevel: string) {
  if (riskLevel === "high") {
    return "danger";
  }

  if (riskLevel === "low") {
    return "success";
  }

  return "warning";
}

function getStatusTone(status: string) {
  if (status === "completed") {
    return "success";
  }

  if (status === "failed") {
    return "danger";
  }

  if (status === "processing") {
    return "warning";
  }

  return "info";
}
