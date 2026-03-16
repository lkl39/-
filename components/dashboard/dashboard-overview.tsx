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
    href: string;
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
};

export function DashboardOverview({
  status,
  message,
  metrics,
  typeBreakdown,
  riskBreakdown,
  modeComparison,
}: DashboardOverviewProps) {
  const tone =
    status === "error" ? "danger" : status === "success" ? "success" : "info";

  return (
    <>
      {message ? (
        <section className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_55px_rgba(2,8,18,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">系统提示</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
            </div>
            <StatusPill label={status === "success" ? "成功" : status === "error" ? "失败" : "提示"} tone={tone} />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SectionCard
          eyebrow="Upload"
          title="日志上传与分析"
          description="首页只保留上传入口。系统默认使用混合分析，分析完成后会直接跳转到本次文件的详情页。"
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

            <div className="grid gap-3 md:grid-cols-[1fr_0.9fr]">
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-200">日志来源</span>
                <select
                  name="sourceType"
                  defaultValue="nginx"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500"
                >
                  <option value="nginx">Nginx</option>
                  <option value="system">System</option>
                  <option value="postgres">Postgres</option>
                  <option value="application">Application</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">分析方式</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Hybrid</p>
                    <p className="mt-1 text-xs leading-6 text-slate-300">
                      规则负责粗筛，模型负责细判。首页不再给用户切换分析模式。
                    </p>
                  </div>
                  <StatusPill label="默认启用" tone="success" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 px-4 py-3 text-xs leading-6 text-slate-400">
              上传成功后，系统会自动写入 <code>logs</code>、<code>log_errors</code> 和 <code>analysis_results</code>，并直接打开本次分析详情。
            </div>

            <SubmitButton
              idleText="上传并开始分析"
              pendingText="正在上传并生成分析结果..."
              className="w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            />
          </form>
        </SectionCard>

        <section className="grid gap-4 md:grid-cols-2">
          {metrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_18px_55px_rgba(2,8,18,0.3)] transition hover:border-cyan-300/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
                    {metric.label}
                  </p>
                  <p className="mt-4 text-3xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{metric.hint}</p>
                </div>
                <StatusPill label="查看" tone={metric.tone} />
              </div>
            </Link>
          ))}
        </section>
      </section>

      <OverviewCharts
        typeBreakdown={typeBreakdown}
        riskBreakdown={riskBreakdown}
        modeComparison={modeComparison}
      />
    </>
  );
}