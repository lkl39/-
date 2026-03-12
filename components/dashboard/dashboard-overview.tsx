import Link from "next/link";
import { createLogUploadAction } from "@/app/logs/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";

type DashboardOverviewProps = {
  status?: string;
  message?: string;
  metrics: {
    label: string;
    value: string;
    hint: string;
    tone: "info" | "success" | "warning" | "danger";
  }[];
  typeBreakdown: {
    label: string;
    value: number;
  }[];
  riskBreakdown: {
    label: string;
    value: number;
    color: string;
  }[];
  modeComparison: {
    mode: string;
    tasks: number;
    findings: number;
    avgConfidence: number;
  }[];
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
  recentAnalyses: {
    id: string;
    cause: string;
    riskLevel: string;
    confidence: number;
    repairSuggestion: string;
    modelName: string;
    analysisMode: string;
    createdAt: string;
  }[];
};

export function DashboardOverview({
  status,
  message,
  metrics,
  typeBreakdown,
  riskBreakdown,
  modeComparison,
  recentLogs,
  recentErrors,
  recentAnalyses,
}: DashboardOverviewProps) {
  const tone =
    status === "error" ? "danger" : status === "success" ? "success" : "info";

  return (
    <>
      {message ? (
        <section className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_55px_rgba(2,8,18,0.28)]">
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
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_18px_55px_rgba(2,8,18,0.3)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
                  {metric.label}
                </p>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-slate-400">{metric.hint}</p>
              </div>
              <StatusPill label={metric.label} tone={metric.tone} />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          eyebrow="Upload"
          title="日志接入控制台"
          description="系统当前固定使用混合分析模式。首页保留上传入口，但不再让用户切换分析模式。"
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
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
                  分析模式
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Hybrid</p>
                    <p className="mt-1 text-xs leading-6 text-slate-300">
                      规则模式和模型模式只保留在图表中用于对比展示，真实任务始终走混合分析。
                    </p>
                  </div>
                  <StatusPill label="Default" tone="success" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-xs leading-6 text-slate-400">
              上传完成后会固定按 <code>hybrid</code> 写入 <code>logs</code>、
              <code>log_errors</code> 和 <code>analysis_results</code>。
            </div>
            <SubmitButton
              idleText="上传并分析日志"
              pendingText="正在写入并生成分析结果..."
              className="w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            />
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Modules"
          title="模块入口"
          description="首页只保留总览。维护型功能逐步拆到独立页面，避免后续信息堆叠。"
        >
          <div className="grid gap-3">
            <Link
              href="/dashboard/rules"
              className="dashboard-panel rounded-3xl border border-cyan-300/20 bg-cyan-300/8 p-4 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">规则中心</p>
                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    管理动态规则，并为后续候选规则和知识沉淀预留入口。
                  </p>
                </div>
                <StatusPill label="Available" tone="success" />
              </div>
            </Link>

            <Link
              href="/dashboard/reviews"
              className="dashboard-panel rounded-3xl border border-amber-300/20 bg-amber-300/8 p-4 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">人工复核</p>
                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    只填写出错位置和解决方法两项内容；不值得保留的异常可以直接跳过。
                  </p>
                </div>
                <StatusPill label="Available" tone="warning" />
              </div>
            </Link>

            <div className="dashboard-panel rounded-3xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">日志详情页</p>
                  <p className="mt-1 text-xs leading-6 text-slate-400">
                    最近上传任务已经支持进入详情页，后续继续承接更细的异常与分析联动。
                  </p>
                </div>
                <StatusPill label="Ready" tone="info" />
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <OverviewCharts
        typeBreakdown={typeBreakdown}
        riskBreakdown={riskBreakdown}
        modeComparison={modeComparison}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          eyebrow="Incidents"
          title="最近异常命中"
          description="这里只保留摘要，详细上下文进入日志详情页或人工复核页查看。"
        >
          <div className="space-y-3">
            {recentErrors.length === 0 ? (
              <EmptyState text="暂无异常命中。上传一份带 error、timeout 或 500 的日志后，这里会出现摘要。" />
            ) : (
              recentErrors.slice(0, 5).map((error) => (
                <div
                  key={error.id}
                  className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {error.errorType}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                        {error.rawText}
                      </p>
                    </div>
                    <StatusPill label={error.detectedBy} tone="info" />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    line {error.lineNumber || "-"} | {formatTimestamp(error.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Analysis"
          title="最近分析结果"
          description="这里展示结构化分析摘要。后续大模型接入后仍然落在同一层。"
        >
          <div className="space-y-3">
            {recentAnalyses.length === 0 ? (
              <EmptyState text="暂无 analysis_results。上传一份命中规则的日志后，这里会显示原因、风险和修复建议。" />
            ) : (
              recentAnalyses.slice(0, 5).map((analysis) => (
                <div
                  key={analysis.id}
                  className="rounded-3xl border border-white/8 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          label={analysis.riskLevel}
                          tone={getRiskTone(analysis.riskLevel)}
                        />
                        <StatusPill label={analysis.analysisMode} tone="info" />
                      </div>
                      <p className="text-sm leading-6 text-white">{analysis.cause}</p>
                      <p className="text-sm leading-6 text-slate-300">
                        {analysis.repairSuggestion}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        confidence
                      </p>
                      <p className="mt-1 text-lg font-semibold text-cyan-200">
                        {formatConfidence(analysis.confidence)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatTimestamp(analysis.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Tasks"
          title="最近上传任务"
          description="这里保留最新任务的摘要，并作为日志详情页入口。"
        >
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <EmptyState text="还没有上传记录。先上传一份日志，确认 Storage 与数据库写入都正常。" />
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/dashboard/logs/${log.id}`}
                        className="text-sm font-semibold text-white transition hover:text-cyan-200"
                      >
                        {log.fileName}
                      </Link>
                      <p className="mt-1 text-xs leading-6 text-slate-400">
                        {log.sourceType} | {log.analysisMode} | {formatBytes(log.fileSize)} |{" "}
                        {log.lineCount} lines
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill label={log.status} tone={getStatusTone(log.status)} />
                      <Link
                        href={`/dashboard/logs/${log.id}`}
                        className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
                      >
                        查看详情
                      </Link>
                    </div>
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
          eyebrow="Direction"
          title="下一步承接位"
          description="这一轮先稳住总览、复核和详情页结构，不把更多管理项重新塞回首页。"
        >
          <div className="space-y-3">
            {[
              "柱状图、饼图和模式对比图已经回到首页，后续继续接更完整的真实统计数据。",
              "人工复核页现在只保留两项输入，后面再按需要接规则候选和知识库沉淀。",
              "analysis_results 继续作为模型输出落点，后续接大模型时不用推翻现有结构。",
              "日志详情页继续承接异常上下文与分析联动，首页保持总览型信息架构。",
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
    </>
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

function formatConfidence(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.00";
  }

  return value.toFixed(2);
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
