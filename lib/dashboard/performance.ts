import { createClient } from "@/lib/supabase/server-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type PerformanceMetricSnapshot = {
  accuracy: number;
  accuracyDelta: number;
  recall: number;
  recallDelta: number;
  speedEps: number;
  speedDelta: number;
};

export type PerformanceFocusMetric = {
  label: string;
  value: number;
  unit: string;
  barPercent: number;
  compareLabel: string;
  compareText: string;
  note: string;
};

export type PerformanceModeRow = {
  modeKey: "rule_only" | "model_only" | "hybrid";
  modeLabel: string;
  accuracy: number;
  recall: number;
  f1: number;
  latencyMs: number;
  status: "recommended" | "high_load" | "baseline";
};

export type PerformanceChartRow = {
  label: string;
  ruleOnly: number;
  modelOnly: number;
  hybrid: number;
};

export type PerformanceRecommendation = {
  title: string;
  summary: string;
  evidence: string[];
  footnote: string;
};

export type PerformanceDataSource = {
  kind: "real" | "demo";
  label: string;
  description: string;
};

export type PerformancePageData = {
  days: number;
  range: {
    startDate: string;
    endDate: string;
    isCustom: boolean;
  };
  metrics: PerformanceMetricSnapshot;
  focusMetrics: {
    accuracy: PerformanceFocusMetric;
    recall: PerformanceFocusMetric;
    latency: PerformanceFocusMetric;
  };
  chart: PerformanceChartRow[];
  modes: PerformanceModeRow[];
  recommendation: PerformanceRecommendation;
  insights: string[];
  pendingReviewCount: number;
  dataSource: PerformanceDataSource;
};

function normalizeConfidence(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value <= 1 ? value : value / 100;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed <= 1 ? parsed : parsed / 100;
}

function normalizeAnalysisMode(value: string | null | undefined) {
  if (value === "rule_only" || value === "model_only" || value === "hybrid") {
    return value;
  }

  if (value === "rule-only" || value === "rule") return "rule_only";
  if (value === "model-only" || value === "model") return "model_only";
  return "hybrid";
}

function toModeLabel(value: "rule_only" | "model_only" | "hybrid") {
  if (value === "rule_only") return "Rule Only";
  if (value === "model_only") return "Model Only";
  return "Hybrid";
}

function buildDemoData(
  days: number,
  startDate: string,
  endDate: string,
  isCustom: boolean,
  reason?: string,
  pendingReviewCount = 12,
): PerformancePageData {
  const speed = days >= 30 ? 168.4 : 182.6;

  return {
    days,
    range: { startDate, endDate, isCustom },
    metrics: {
      accuracy: 89.8,
      accuracyDelta: 3.6,
      recall: 84.7,
      recallDelta: 5.2,
      speedEps: speed,
      speedDelta: 18.4,
    },
    focusMetrics: {
      accuracy: {
        label: "混合模式准确性",
        value: 92.4,
        unit: "%",
        barPercent: 92,
        compareLabel: "较 Rule Only 提升",
        compareText: "8.1 个点",
        note: "Rule Only 84.3% · Hybrid 92.4%",
      },
      recall: {
        label: "混合模式覆盖率",
        value: 88.7,
        unit: "%",
        barPercent: 89,
        compareLabel: "较 Rule Only 提升",
        compareText: "14.5 个点",
        note: "Rule Only 74.2% · Hybrid 88.7%",
      },
      latency: {
        label: "混合模式平均延迟",
        value: 148.2,
        unit: "ms",
        barPercent: 29,
        compareLabel: "较 Model Only 更低",
        compareText: "60.9ms",
        note: "Model Only 209.1ms · Hybrid 148.2ms",
      },
    },
    chart: [
      { label: "准确率", ruleOnly: 84.3, modelOnly: 90.6, hybrid: 92.4 },
      { label: "召回率", ruleOnly: 74.2, modelOnly: 81.5, hybrid: 88.7 },
      { label: "吞吐量", ruleOnly: 100, modelOnly: 63.4, hybrid: 86.9 },
      { label: "资源消耗", ruleOnly: 35.5, modelOnly: 100, hybrid: 70.9 },
    ],
    modes: [
      { modeKey: "rule_only", modeLabel: "Rule Only", accuracy: 84.3, recall: 74.2, f1: 0.789, latencyMs: 74.2, status: "baseline" },
      { modeKey: "model_only", modeLabel: "Model Only", accuracy: 90.6, recall: 81.5, f1: 0.858, latencyMs: 209.1, status: "high_load" },
      { modeKey: "hybrid", modeLabel: "Hybrid", accuracy: 92.4, recall: 88.7, f1: 0.905, latencyMs: 148.2, status: "recommended" },
    ],
    recommendation: {
      title: "默认推荐：混合模式",
      summary: "当前对比视图按样例口径展示；从当前对比结果看，混合模式在覆盖率、准确率与延迟之间更均衡，适合作为默认方案。",
      evidence: [
        "相较 Rule Only，混合模式准确性提升 8.1 个点。",
        "相较 Rule Only，混合模式覆盖率提升 14.5 个点。",
        "相较 Model Only，混合模式平均延迟低 60.9ms。",
      ],
      footnote: "当前为样例对比口径，用于快速查看三模式差异与推荐结论。",
    },
    insights: [
      "Rule Only 响应最快，但覆盖率偏低，更适合作为规则兜底基线。",
      "Model Only 判断质量较高，但延迟和资源消耗明显更高。",
      "Hybrid 在质量、覆盖率和成本之间更均衡，适合作为默认运行模式。",
    ],
    pendingReviewCount,
    dataSource: {
      kind: "demo",
      label: "样例对比口径",
      description: reason ?? "当前按样例对比口径展示，便于快速查看三模式差异。",
    },
  };
}

function hasSufficientComparisonData(modeRows: Array<{ tasks: number }>, totalTasks: number, totalFindings: number) {
  if (totalTasks <= 0 || totalFindings <= 0) {
    return false;
  }

  const activeModes = modeRows.filter((item) => item.tasks > 0).length;
  return activeModes >= 2;
}

export async function getPerformancePageData(input?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): Promise<PerformancePageData> {
  const daysParam = input?.days === 30 ? 30 : 7;
  const startDateParam = String(input?.startDate ?? "").trim();
  const endDateParam = String(input?.endDate ?? "").trim();
  const isValidDateInput = /^\d{4}-\d{2}-\d{2}$/;
  const hasCustomRange = isValidDateInput.test(startDateParam) && isValidDateInput.test(endDateParam);

  const now = new Date();
  let currentStart: Date;
  let currentEndExclusive: Date;
  let rangeDays = 7;

  if (hasCustomRange) {
    const customStart = new Date(`${startDateParam}T00:00:00.000Z`);
    const customEndExclusive = new Date(`${endDateParam}T00:00:00.000Z`);
    customEndExclusive.setUTCDate(customEndExclusive.getUTCDate() + 1);

    if (Number.isFinite(customStart.getTime()) && Number.isFinite(customEndExclusive.getTime()) && customStart < customEndExclusive) {
      currentStart = customStart;
      currentEndExclusive = customEndExclusive;
      const diffMs = currentEndExclusive.getTime() - currentStart.getTime();
      rangeDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
    } else {
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - 6);
      currentEndExclusive = new Date(now);
      currentEndExclusive.setDate(now.getDate() + 1);
    }
  } else {
    currentStart = new Date(now);
    currentStart.setDate(now.getDate() - daysParam + 1);
    currentEndExclusive = new Date(now);
    currentEndExclusive.setDate(now.getDate() + 1);
    rangeDays = daysParam;
  }

  const rangeStart = currentStart.toISOString().slice(0, 10);
  const rangeEnd = new Date(currentEndExclusive.getTime() - 1000).toISOString().slice(0, 10);

  if (!hasSupabaseEnv()) {
    return buildDemoData(
      rangeDays,
      rangeStart,
      rangeEnd,
      hasCustomRange,
      "当前按样例对比口径展示，便于快速查看三模式差异。",
      0,
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return buildDemoData(
      rangeDays,
      rangeStart,
      rangeEnd,
      hasCustomRange,
      "当前按样例对比口径展示，便于快速查看三模式差异。",
      0,
    );
  }

  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousEnd.getDate() - rangeDays);

  const [currentLogsResult, currentAnalysesResult, previousLogsResult, previousAnalysesResult, pendingReviewsResult] = await Promise.all([
    supabase.from("logs").select("id, analysis_mode, created_at").eq("user_id", user.id).gte("created_at", currentStart.toISOString()).lt("created_at", currentEndExclusive.toISOString()).order("created_at", { ascending: false }).limit(5000),
    supabase.from("analysis_results").select("log_id, analysis_mode, confidence, latency_ms, created_at").eq("user_id", user.id).gte("created_at", currentStart.toISOString()).lt("created_at", currentEndExclusive.toISOString()).order("created_at", { ascending: false }).limit(10000),
    supabase.from("logs").select("id, analysis_mode, created_at").eq("user_id", user.id).gte("created_at", previousStart.toISOString()).lt("created_at", previousEnd.toISOString()).order("created_at", { ascending: false }).limit(5000),
    supabase.from("analysis_results").select("log_id, analysis_mode, confidence, latency_ms, created_at").eq("user_id", user.id).gte("created_at", previousStart.toISOString()).lt("created_at", previousEnd.toISOString()).order("created_at", { ascending: false }).limit(10000),
    supabase.from("review_cases").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("review_status", "pending"),
  ]);

  const modeKeys = ["rule_only", "model_only", "hybrid"] as const;
  const modeStats = new Map(modeKeys.map((key) => [key, { tasks: 0, findings: 0, confidenceSum: 0, latencySum: 0, latencyCount: 0 }]));

  for (const item of currentLogsResult.data ?? []) {
    const mode = normalizeAnalysisMode(item.analysis_mode) as (typeof modeKeys)[number];
    const stat = modeStats.get(mode);
    if (stat) stat.tasks += 1;
  }

  for (const item of currentAnalysesResult.data ?? []) {
    const mode = normalizeAnalysisMode(item.analysis_mode) as (typeof modeKeys)[number];
    const stat = modeStats.get(mode);
    if (!stat) continue;
    stat.findings += 1;
    stat.confidenceSum += normalizeConfidence(item.confidence);
    if (typeof item.latency_ms === "number" && Number.isFinite(item.latency_ms)) {
      stat.latencySum += item.latency_ms;
      stat.latencyCount += 1;
    }
  }

  const previousLogs = previousLogsResult.data ?? [];
  const previousAnalyses = previousAnalysesResult.data ?? [];
  const previousConfidenceAvg = previousAnalyses.length ? (previousAnalyses.reduce((sum, item) => sum + normalizeConfidence(item.confidence), 0) / previousAnalyses.length) * 100 : 0;
  const previousRecall = previousLogs.length ? Math.min(100, (previousAnalyses.length / previousLogs.length) * 100) : 0;
  const previousSpeed = rangeDays > 0 ? previousLogs.length / rangeDays : 0;

  const modeRows = modeKeys.map((mode) => {
    const stat = modeStats.get(mode)!;
    const accuracy = stat.findings > 0 ? (stat.confidenceSum / stat.findings) * 100 : 0;
    const recall = stat.tasks > 0 ? Math.min(100, (stat.findings / stat.tasks) * 100) : 0;
    const f1 = accuracy + recall > 0 ? (2 * accuracy * recall) / (accuracy + recall) : 0;
    const latencyMs = stat.latencyCount > 0 ? stat.latencySum / stat.latencyCount : 0;
    return { mode, modeLabel: toModeLabel(mode), tasks: stat.tasks, findings: stat.findings, accuracy: Number(accuracy.toFixed(2)), recall: Number(recall.toFixed(2)), f1: Number((f1 / 100).toFixed(3)), latencyMs: Number(latencyMs.toFixed(1)) };
  });

  const totalTasks = modeRows.reduce((sum, item) => sum + item.tasks, 0);
  const totalFindings = modeRows.reduce((sum, item) => sum + item.findings, 0);
  const pendingReviewCount = pendingReviewsResult.count ?? 0;

  if (!hasSufficientComparisonData(modeRows, totalTasks, totalFindings)) {
    return buildDemoData(
      rangeDays,
      rangeStart,
      rangeEnd,
      hasCustomRange,
      "当前按样例对比口径展示，便于快速查看三模式差异。",
      pendingReviewCount,
    );
  }

  const weightedAccuracy = totalFindings ? modeRows.reduce((sum, item) => sum + item.accuracy * item.findings, 0) / totalFindings : 0;
  const overallRecall = totalTasks ? Math.min(100, (totalFindings / totalTasks) * 100) : 0;
  const currentSpeed = rangeDays > 0 ? totalTasks / rangeDays : 0;
  const latencyMax = Math.max(...modeRows.map((item) => item.latencyMs), 1);
  const speedMax = Math.max(...modeRows.map((item) => item.tasks / Math.max(1, rangeDays)), 1);

  const chart: PerformanceChartRow[] = [
    { label: "准确率", ruleOnly: Number((modeRows[0]?.accuracy ?? 0).toFixed(1)), modelOnly: Number((modeRows[1]?.accuracy ?? 0).toFixed(1)), hybrid: Number((modeRows[2]?.accuracy ?? 0).toFixed(1)) },
    { label: "召回率", ruleOnly: Number((modeRows[0]?.recall ?? 0).toFixed(1)), modelOnly: Number((modeRows[1]?.recall ?? 0).toFixed(1)), hybrid: Number((modeRows[2]?.recall ?? 0).toFixed(1)) },
    { label: "吞吐量", ruleOnly: Number((((modeRows[0]?.tasks ?? 0) / Math.max(1, rangeDays)) / speedMax * 100).toFixed(1)), modelOnly: Number((((modeRows[1]?.tasks ?? 0) / Math.max(1, rangeDays)) / speedMax * 100).toFixed(1)), hybrid: Number((((modeRows[2]?.tasks ?? 0) / Math.max(1, rangeDays)) / speedMax * 100).toFixed(1)) },
    { label: "资源消耗", ruleOnly: Number((((modeRows[0]?.latencyMs ?? 0) / latencyMax) * 100).toFixed(1)), modelOnly: Number((((modeRows[1]?.latencyMs ?? 0) / latencyMax) * 100).toFixed(1)), hybrid: Number((((modeRows[2]?.latencyMs ?? 0) / latencyMax) * 100).toFixed(1)) },
  ];

  const bestAccuracyMode = [...modeRows].sort((a, b) => b.accuracy - a.accuracy)[0];
  const highestLatencyMode = [...modeRows].sort((a, b) => b.latencyMs - a.latencyMs)[0];
  const bestF1Mode = [...modeRows].sort((a, b) => b.f1 - a.f1)[0];
  const emptyModeRow = { mode: "hybrid" as const, modeLabel: toModeLabel("hybrid"), tasks: 0, findings: 0, accuracy: 0, recall: 0, f1: 0, latencyMs: 0 };
  const ruleMode = modeRows.find((item) => item.mode === "rule_only") ?? { ...emptyModeRow, mode: "rule_only" as const, modeLabel: toModeLabel("rule_only") };
  const modelMode = modeRows.find((item) => item.mode === "model_only") ?? { ...emptyModeRow, mode: "model_only" as const, modeLabel: toModeLabel("model_only") };
  const hybridMode = modeRows.find((item) => item.mode === "hybrid") ?? emptyModeRow;

  const hybridAccuracyGainVsRule = Number((hybridMode.accuracy - ruleMode.accuracy).toFixed(1));
  const hybridRecallGainVsRule = Number((hybridMode.recall - ruleMode.recall).toFixed(1));
  const hybridLatencySavingVsModel = Number((modelMode.latencyMs - hybridMode.latencyMs).toFixed(1));
  const latencyBarPercent = modelMode.latencyMs > 0 ? Math.max(8, Math.min(100, Math.round((Math.max(0, hybridLatencySavingVsModel) / modelMode.latencyMs) * 100))) : 0;
  const recommendationTitle = bestF1Mode?.mode === "hybrid" ? "默认推荐：混合模式" : "默认推荐：混合模式（综合口径）";
  const recommendationSummary = `在最近 ${rangeDays} 天的真实运行窗口里，混合模式同时保持 ${hybridMode.accuracy.toFixed(1)}% 的判断质量、${hybridMode.recall.toFixed(1)}% 的问题覆盖率，并将平均延迟控制在 ${hybridMode.latencyMs.toFixed(1)}ms。`;
  const latencyEvidence = hybridLatencySavingVsModel >= 0 ? `相较 Model Only，混合模式平均延迟低 ${Math.abs(hybridLatencySavingVsModel).toFixed(1)}ms，更适合作为默认路径。` : `当前窗口期混合模式平均延迟高 ${Math.abs(hybridLatencySavingVsModel).toFixed(1)}ms，但换来了更高覆盖率与更均衡的综合表现。`;

  return {
    days: rangeDays,
    range: { startDate: rangeStart, endDate: rangeEnd, isCustom: hasCustomRange },
    metrics: { accuracy: Number(weightedAccuracy.toFixed(1)), accuracyDelta: Number((weightedAccuracy - previousConfidenceAvg).toFixed(1)), recall: Number(overallRecall.toFixed(1)), recallDelta: Number((overallRecall - previousRecall).toFixed(1)), speedEps: Number(currentSpeed.toFixed(1)), speedDelta: Number((currentSpeed - previousSpeed).toFixed(1)) },
    focusMetrics: {
      accuracy: { label: "混合模式准确性", value: Number(hybridMode.accuracy.toFixed(1)), unit: "%", barPercent: Math.max(0, Math.min(100, Math.round(hybridMode.accuracy))), compareLabel: hybridAccuracyGainVsRule >= 0 ? "较 Rule Only 提升" : "较 Rule Only 下降", compareText: `${Math.abs(hybridAccuracyGainVsRule).toFixed(1)} 个点`, note: `Rule Only ${ruleMode.accuracy.toFixed(1)}% · Hybrid ${hybridMode.accuracy.toFixed(1)}%` },
      recall: { label: "混合模式覆盖率", value: Number(hybridMode.recall.toFixed(1)), unit: "%", barPercent: Math.max(0, Math.min(100, Math.round(hybridMode.recall))), compareLabel: hybridRecallGainVsRule >= 0 ? "较 Rule Only 提升" : "较 Rule Only 下降", compareText: `${Math.abs(hybridRecallGainVsRule).toFixed(1)} 个点`, note: `Rule Only ${ruleMode.recall.toFixed(1)}% · Hybrid ${hybridMode.recall.toFixed(1)}%` },
      latency: { label: "混合模式平均延迟", value: Number(hybridMode.latencyMs.toFixed(1)), unit: "ms", barPercent: latencyBarPercent, compareLabel: hybridLatencySavingVsModel >= 0 ? "较 Model Only 更低" : "较 Model Only 更高", compareText: `${Math.abs(hybridLatencySavingVsModel).toFixed(1)}ms`, note: `Model Only ${modelMode.latencyMs.toFixed(1)}ms · Hybrid ${hybridMode.latencyMs.toFixed(1)}ms` },
    },
    chart,
    modes: modeRows.map((item) => ({ modeKey: item.mode, modeLabel: item.modeLabel, accuracy: item.accuracy, recall: item.recall, f1: item.f1, latencyMs: item.latencyMs, status: item.mode === "hybrid" ? "recommended" : item.mode === "model_only" ? "high_load" : "baseline" })),
    recommendation: {
      title: recommendationTitle,
      summary: recommendationSummary,
      evidence: [
        `相较 Rule Only，混合模式准确性变化 ${hybridAccuracyGainVsRule >= 0 ? "+" : "-"}${Math.abs(hybridAccuracyGainVsRule).toFixed(1)} 个点。`,
        `相较 Rule Only，混合模式覆盖率变化 ${hybridRecallGainVsRule >= 0 ? "+" : "-"}${Math.abs(hybridRecallGainVsRule).toFixed(1)} 个点。`,
        latencyEvidence,
      ],
      footnote: "数据来自当前窗口期真实日志与 analysis_results 聚合，页面本身不触发三模式重跑。",
    },
    insights: [
      `${bestAccuracyMode?.modeLabel ?? "Hybrid"} 在当前窗口期判断质量表现最佳。`,
      `${hybridMode.modeLabel} 在覆盖率与成本之间更均衡，更适合作为默认方案。`,
      `${highestLatencyMode?.modeLabel ?? "Model Only"} 平均延迟更高，建议配合规则前置过滤。`,
    ],
    pendingReviewCount,
    dataSource: {
      kind: "real",
      label: "窗口聚合口径",
      description: "基于当前账号在所选时间范围内的 logs、analysis_results 与 review_cases 聚合。",
    },
  };
}

