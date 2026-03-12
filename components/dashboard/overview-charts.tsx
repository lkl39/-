"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/dashboard/section-card";

type OverviewChartsProps = {
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

export function OverviewCharts({
  typeBreakdown,
  riskBreakdown,
  modeComparison,
}: OverviewChartsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.95fr_1fr]">
      <SectionCard
        eyebrow="Overview"
        title="异常类型柱状图"
        description="按命中的异常类型统计最近一批数据，用来快速判断当前主故障面。"
      >
        {typeBreakdown.length === 0 ? (
          <EmptyChart text="暂无异常类型数据" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeBreakdown}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  contentStyle={{
                    backgroundColor: "#081120",
                    border: "1px solid rgba(148,163,184,0.16)",
                    borderRadius: "16px",
                    color: "#e2e8f0",
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[10, 10, 0, 0]}
                  fill="#22d3ee"
                  maxBarSize={56}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Risk"
        title="风险等级饼图"
        description="按 analysis_results 中的风险等级汇总，突出高风险和待人工确认的问题。"
      >
        {riskBreakdown.length === 0 ? (
          <EmptyChart text="暂无风险分布数据" />
        ) : (
          <div className="grid items-center gap-5 md:grid-cols-[190px_1fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskBreakdown}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                  >
                    {riskBreakdown.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#081120",
                      border: "1px solid rgba(148,163,184,0.16)",
                      borderRadius: "16px",
                      color: "#e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {riskBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white/5 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-300">{item.label}</span>
                    </div>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Modes"
        title="分析模式对比图"
        description="这里保留 Rule Only、Model Only、Hybrid 的对比展示，用来直观看出混合模式更完整、更稳定。"
      >
        {modeComparison.every(
          (item) => item.tasks === 0 && item.findings === 0 && item.avgConfidence === 0,
        ) ? (
          <EmptyChart text="暂无模式对比数据" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={modeComparison}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis
                  dataKey="mode"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#081120",
                    border: "1px solid rgba(148,163,184,0.16)",
                    borderRadius: "16px",
                    color: "#e2e8f0",
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="tasks"
                  name="任务数"
                  fill="#22d3ee"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="findings"
                  name="分析条数"
                  fill="#f59e0b"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgConfidence"
                  name="平均置信度"
                  stroke="#f8fafc"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f8fafc" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/25 text-sm text-slate-400">
      {text}
    </div>
  );
}
