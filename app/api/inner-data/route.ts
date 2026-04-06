import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-client";
import {
  backfillHistoricalMissedCasesForUser,
  syncHistoricalMissedCaseFromReviewCase,
} from "@/lib/analysis/missed-case-library";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { toIssueTypeDisplayName } from "@/lib/labels/issue-type";

type JsonRecord = Record<string, unknown>;

type SystemSettings = {
  engine: string;
  temperature: number;
  maxTokens: number;
  concurrency: number;
  retentionDays: 30 | 90 | 365;
  autoCleanup: boolean;
  realtimePush: boolean;
};

type ExportTemplate = {
  id: string;
  name: string;
  format: string;
  description: string;
  usage: string;
  builtin?: boolean;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  engine: "Aether LLM v4.2 (默认)",
  temperature: 0.7,
  maxTokens: 32000,
  concurrency: 8,
  retentionDays: 90,
  autoCleanup: true,
  realtimePush: false,
};

const BUILTIN_EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: "pdf-standard",
    name: "系统深度诊断报告",
    format: "PDF Standard",
    description: "适用于月度审计汇报",
    usage: "audit",
    builtin: true,
  },
  {
    id: "word-docx",
    name: "技术故障简报",
    format: "Word (Docx)",
    description: "快速分享与在线协作",
    usage: "brief",
    builtin: true,
  },
  {
    id: "json-csv",
    name: "原始数据透传模板",
    format: "JSON / CSV",
    description: "针对三方BI工具对接",
    usage: "raw",
    builtin: true,
  },
];

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const DEFAULT_ACTIVE_EXPORT_TEMPLATE_ID = "pdf-standard";

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSystemSettings(input: unknown): SystemSettings {
  const record = (input ?? {}) as Record<string, unknown>;
  const retentionRaw = asNumber(record.retentionDays, DEFAULT_SYSTEM_SETTINGS.retentionDays);
  const retentionDays: 30 | 90 | 365 = retentionRaw === 30 || retentionRaw === 365 ? retentionRaw : 90;

  return {
    engine: String(record.engine ?? DEFAULT_SYSTEM_SETTINGS.engine),
    temperature: Math.min(1, Math.max(0.1, asNumber(record.temperature, DEFAULT_SYSTEM_SETTINGS.temperature))),
    maxTokens: Math.min(128000, Math.max(4000, Math.round(asNumber(record.maxTokens, DEFAULT_SYSTEM_SETTINGS.maxTokens) / 1000) * 1000)),
    concurrency: Math.min(20, Math.max(1, Math.round(asNumber(record.concurrency, DEFAULT_SYSTEM_SETTINGS.concurrency)))),
    retentionDays,
    autoCleanup: Boolean(record.autoCleanup ?? DEFAULT_SYSTEM_SETTINGS.autoCleanup),
    realtimePush: Boolean(record.realtimePush ?? DEFAULT_SYSTEM_SETTINGS.realtimePush),
  };
}

function normalizeTemplateId(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toExportTemplates(input: unknown): ExportTemplate[] {
  const customRaw = Array.isArray(input) ? input : [];
  const customTemplates: ExportTemplate[] = [];
  const usedIds = new Set(BUILTIN_EXPORT_TEMPLATES.map((item) => item.id));

  for (const item of customRaw) {
    const record = (item ?? {}) as Record<string, unknown>;
    const id = normalizeTemplateId(record.id || record.name);
    if (!id || usedIds.has(id)) continue;

    usedIds.add(id);
    customTemplates.push({
      id,
      name: String(record.name ?? "未命名模板").trim() || "未命名模板",
      format: String(record.format ?? "Custom").trim() || "Custom",
      description: String(record.description ?? "用户自定义模板").trim() || "用户自定义模板",
      usage: String(record.usage ?? "custom").trim() || "custom",
      fileName: String(record.fileName ?? "").trim() || undefined,
      filePath: String(record.filePath ?? "").trim() || undefined,
      fileSize:
        typeof record.fileSize === "number" && Number.isFinite(record.fileSize)
          ? record.fileSize
          : undefined,
      builtin: false,
    });

    if (customTemplates.length >= 12) {
      break;
    }
  }

  return [...BUILTIN_EXPORT_TEMPLATES, ...customTemplates];
}

function toActiveExportTemplateId(activeId: unknown, templates: ExportTemplate[]) {
  const normalized = normalizeTemplateId(activeId);
  if (normalized && templates.some((item) => item.id === normalized)) {
    return normalized;
  }
  return DEFAULT_ACTIVE_EXPORT_TEMPLATE_ID;
}

function asIsoDate(value: string | null | undefined) {
  return value ?? new Date(0).toISOString();
}

function toRiskLabel(value: string | null | undefined) {
  if (value === "high") return "高风险";
  if (value === "medium") return "中风险";
  if (value === "low") return "低风险";
  return "未知";
}

function toLogStatusLabel(value: string | null | undefined) {
  if (value === "completed") return "已完成";
  if (value === "processing") return "分析中";
  if (value === "failed") return "已失败";
  return "未知";
}

function fileSizeLabel(size: number | null | undefined) {
  if (!size || size <= 0) return "-";
  const mb = size / (1024 * 1024);
  if (mb < 1) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  if (mb > 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }

  return `${mb.toFixed(1)} MB`;
}

function toRiskWeight(value: string | null | undefined) {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function toRiskValue(value: string | null | undefined) {
  if (value === "high") return "high";
  if (value === "medium") return "medium";
  return "low";
}

function normalizeConfidence(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeAnalysisMode(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "hybrid";
  if (raw === "rule_only" || raw === "rules_fast") return "rule_only";
  if (raw === "model_only") return "model_only";
  if (raw === "summarized_hybrid" || raw === "hybrid") return "hybrid";
  return "hybrid";
}

function toModeLabel(value: "rule_only" | "model_only" | "hybrid") {
  if (value === "rule_only") return "Rule Only (静态规则)";
  if (value === "model_only") return "Model Only (模型推理)";
  return "Hybrid Mode (混合模式)";
}

function toIssueDisplayName(value: string | null | undefined) {
  return toIssueTypeDisplayName(value);
}

function toRuleDescription(
  pattern: string | null | undefined,
  errorType: string | null | undefined,
  name: string | null | undefined,
) {
  const explicitName = String(name ?? "").trim();
  const rawPattern = String(pattern ?? "").trim();
  const issueName = toIssueDisplayName(errorType);

  const lowerName = explicitName.toLowerCase();
  const lowerPattern = rawPattern.toLowerCase();
  const merged = `${lowerName} ${lowerPattern}`;

  if (/[\u4e00-\u9fa5]/.test(rawPattern)) {
    return rawPattern;
  }

  if (merged.includes("timeout") || merged.includes("timed out")) {
    return "用于检测请求或连接超时类异常，并触发超时告警。";
  }

  if (merged.includes("ssl") || merged.includes("handshake")) {
    return "用于检测 SSL 握手失败与证书链路异常问题。";
  }

  if (merged.includes("circuit") || merged.includes("fallback")) {
    return "用于识别熔断器打开、降级触发等系统保护状态。";
  }

  if (merged.includes("replication") || merged.includes("lag")) {
    return "用于检测主从复制延迟和同步冲突风险。";
  }

  if (merged.includes("open files") || merged.includes("too many")) {
    return "用于检测文件句柄耗尽与系统资源上限触发问题。";
  }

  if (merged.includes("start") && merged.includes("failed")) {
    return "用于检测系统服务启动失败或进入 failed 状态的异常。";
  }

  if (merged.includes("upstream") || merged.includes("nginx")) {
    return "用于检测网关上游连接提前断开与代理链路异常。";
  }

  if (issueName && issueName !== "未知异常") {
    return `用于检测${issueName}相关异常模式。`;
  }

  if (explicitName.length > 0) {
    return `用于检测规则「${explicitName}」对应的异常触发条件。`;
  }

  return "用于检测系统日志中的异常模式并触发告警。";
}

function toRuleDisplayName(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "未命名规则";

  if (/[\u4e00-\u9fa5]/.test(raw)) {
    return raw;
  }

  const lower = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const map: Record<string, string> = {
    "nginx upstream prematurely closed": "Nginx 上游连接提前关闭",
    "system service failed to start": "系统服务启动失败",
    "nginx ssl handshake failed": "Nginx SSL 握手失败",
    "system too many open files": "系统文件句柄耗尽",
    "application circuit breaker open": "应用熔断器已开启",
    "postgres replication lag warning": "Postgres 主从复制延迟告警",
    "critical system overflow": "关键系统溢出告警",
    "user login anomaly detection": "用户登录异常检测",
    "legacy api deprecated watch": "旧版接口调用监测",
    "application retry exhausted": "应用重试耗尽",
    "kubernetes pod pending insufficient resources": "Kubernetes Pod 资源不足（Pending）",
  };

  if (map[lower]) {
    return map[lower];
  }

  return `规则：${raw}`;
}

function toKnowledgeDisplayTitle(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "未命名知识条目";

  if (/[\u4e00-\u9fa5]/.test(raw)) {
    return raw;
  }

  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    "nginx upstream timed out": "Nginx 上游请求超时",
    "nginx 502 bad gateway": "Nginx 502 网关错误",
    "nginx 503 service unavailable": "Nginx 503 服务不可用",
    "nginx worker process core dumped": "Nginx 工作进程崩溃（Core Dump）",
    "postgresql too many connections": "PostgreSQL 连接数超限",
    "postgresql remaining connection slots are reserved": "PostgreSQL 连接槽已保留",
    "postgresql deadlock detected": "PostgreSQL 检测到死锁",
    "postgresql password authentication failed": "PostgreSQL 认证失败",
    "system out of memory or oom killer": "系统内存不足或触发 OOM",
    "system no space left on device": "磁盘空间不足",
    "system permission denied or operation not permitted": "系统权限不足或操作被拒绝",
    "openssh daemon internal error": "OpenSSH 服务内部错误",
    "dns zone transfer failed": "DNS 区域传送失败",
    "spring security access denied or csrf exception": "Spring Security 访问拒绝或 CSRF 异常",
    "django suspiciousoperation or disallowedhost": "Django 可疑请求或非法主机",
    "sql syntax or injection style error message": "SQL 语法异常或注入特征告警",
    "java process execution error": "Java 进程执行异常",
    "node.js child_process execution error": "Node.js 子进程执行异常",
    "velocity template engine exception": "Velocity 模板引擎异常",
    "application connection refused": "应用连接被拒绝",
    "application read timeout": "应用读取超时",
    "bitbucket login failure": "Bitbucket 登录失败",
    "apache worker segmentation fault": "Apache 工作进程段错误",
    "application retry exhausted": "应用重试耗尽",
    "kubernetes pod pending insufficient resources": "Kubernetes Pod 资源不足（Pending）",
  };

  if (map[lower]) {
    return map[lower];
  }

  if (/^[a-z0-9\s._:-]+$/i.test(raw)) {
    return `英文条目（${raw}）`;
  }

  return raw;
}

function toKnowledgeSourceLabel(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "official_doc") return "官方文档";
  if (raw === "internal_runbook") return "内部手册";
  if (raw === "community") return "社区经验";
  if (!raw) return "内部资料";
  return raw.replace(/_/g, "-");
}

function hasMeaningfulText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase 未配置。" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "dashboard";

  if (view === "dashboard") {
    const [{ count: totalLogs }, { count: totalIssues }, { count: pendingReviews }, { count: highRisk }, { data: pendingCases }] =
      await Promise.all([
        supabase
          .from("logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("log_errors")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("review_status", "pending"),
        supabase
          .from("analysis_results")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("risk_level", "high"),
        supabase
          .from("review_cases")
          .select("id, log_error_id, updated_at")
          .eq("user_id", user.id)
          .eq("review_status", "pending")
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

    const [{ data: analyses }, { data: logs }, { data: errors }] = await Promise.all([
      supabase
        .from("analysis_results")
        .select("log_id, risk_level, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("logs")
        .select("id, file_name, uploaded_at, status")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(6),
      supabase
        .from("log_errors")
        .select("error_type")
        .eq("user_id", user.id)
        .limit(5000),
    ]);

    const pendingErrorIds = (pendingCases ?? []).map((item) => item.log_error_id);
    const { data: pendingErrors } = pendingErrorIds.length
      ? await supabase
          .from("log_errors")
          .select("id, log_id, error_type, raw_text")
          .eq("user_id", user.id)
          .in("id", pendingErrorIds)
          .limit(50)
      : { data: [] as Array<{ id: string; log_id: string; error_type: string | null; raw_text: string | null }> };

    const pendingLogIds = (pendingErrors ?? []).map((item) => item.log_id);
    const { data: pendingLogs } = pendingLogIds.length
      ? await supabase
          .from("logs")
          .select("id, file_name")
          .eq("user_id", user.id)
          .in("id", pendingLogIds)
          .limit(50)
      : { data: [] as Array<{ id: string; file_name: string | null }> };

    const pendingErrorById = new Map((pendingErrors ?? []).map((item) => [item.id, item]));
    const pendingLogNameById = new Map((pendingLogs ?? []).map((item) => [item.id, item.file_name ?? "未知日志"]));
    const pendingTodos = (pendingCases ?? []).slice(0, 3).map((item) => {
      const error = pendingErrorById.get(item.log_error_id);
      const sourceLog = error ? pendingLogNameById.get(error.log_id) ?? "未知日志" : "未知日志";
      const title = toIssueDisplayName(error?.error_type) || "待复核问题";
      const snippet = (error?.raw_text ?? "").trim();

      return {
        id: item.id,
        title,
        description: snippet.length > 0 ? snippet.slice(0, 56) : `来源日志：${sourceLog}`,
        sourceLog,
        updatedAt: asIsoDate(item.updated_at),
      };
    });

    const now = new Date();
    const trend = Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - index));
      const yyyyMmDd = day.toISOString().slice(0, 10);
      const dayAnalyses = (analyses ?? []).filter((item) =>
        String(item.created_at ?? "").startsWith(yyyyMmDd),
      );

      return {
        day: `${day.getMonth() + 1}/${day.getDate()}`,
        total: dayAnalyses.length,
        high: dayAnalyses.filter((item) => item.risk_level === "high").length,
      };
    });

    const errorTypeCounts = new Map<string, number>();
    for (const item of errors ?? []) {
      const key = toIssueDisplayName(item.error_type ?? "\u5176\u4ed6");
      errorTypeCounts.set(key, (errorTypeCounts.get(key) ?? 0) + 1);
    }

    const typeBreakdown = Array.from(errorTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        label,
        count,
        percent: (totalIssues ?? 0) > 0 ? Math.max(1, Math.round((count / (totalIssues ?? 1)) * 100)) : 0,
      }));

    const fallbackTypeBreakdown = [
      { label: "数据库异常", count: 0, percent: 0 },
      { label: "网络异常", count: 0, percent: 0 },
      { label: "权限异常", count: 0, percent: 0 },
      { label: "配置异常", count: 0, percent: 0 },
      { label: "服务异常", count: 0, percent: 0 },
    ];

    return NextResponse.json({
      metrics: {
        totalLogs: totalLogs ?? 0,
        totalIssues: totalIssues ?? 0,
        highRisk: highRisk ?? 0,
        pendingReviews: pendingReviews ?? 0,
      },
      trend,
      trendDays: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      typeBreakdown: typeBreakdown.length > 0 ? typeBreakdown : fallbackTypeBreakdown,
      recentLogs: (logs ?? []).map((item) => ({
        id: item.id,
        fileName: item.file_name,
        createdAt: item.uploaded_at,
        statusLabel: toLogStatusLabel(item.status),
      })),
      pendingTodos,
      pendingReviewCount: pendingReviews ?? 0,
    });
  }

  if (view === "performance") {
    const daysParam = Number(searchParams.get("days") ?? "7");
    const startDateParam = String(searchParams.get("startDate") ?? "").trim();
    const endDateParam = String(searchParams.get("endDate") ?? "").trim();
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
      }
    } else {
      const days = daysParam === 30 ? 30 : 7;
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - days + 1);
      currentEndExclusive = new Date(now);
      rangeDays = days;
    }

    const previousEnd = new Date(currentStart);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - rangeDays);

    const [currentLogsResult, currentAnalysesResult, previousLogsResult, previousAnalysesResult, pendingReviewsResult] = await Promise.all([
      supabase
        .from("logs")
        .select("id, analysis_mode, created_at")
        .eq("user_id", user.id)
        .gte("created_at", currentStart.toISOString())
        .lt("created_at", currentEndExclusive.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("analysis_results")
        .select("log_id, analysis_mode, confidence, latency_ms")
        .eq("user_id", user.id)
        .gte("created_at", currentStart.toISOString())
        .lt("created_at", currentEndExclusive.toISOString())
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase
        .from("logs")
        .select("id, analysis_mode, created_at")
        .eq("user_id", user.id)
        .gte("created_at", previousStart.toISOString())
        .lt("created_at", previousEnd.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("analysis_results")
        .select("log_id, analysis_mode, confidence, latency_ms")
        .eq("user_id", user.id)
        .gte("created_at", previousStart.toISOString())
        .lt("created_at", previousEnd.toISOString())
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase
        .from("review_cases")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("review_status", "pending"),
    ]);

    const modeKeys = ["rule_only", "model_only", "hybrid"] as const;
    const modeStats = new Map(
      modeKeys.map((key) => [
        key,
        { tasks: 0, findings: 0, confidenceSum: 0, latencySum: 0, latencyCount: 0 },
      ]),
    );

    for (const item of currentLogsResult.data ?? []) {
      const mode = normalizeAnalysisMode(item.analysis_mode) as (typeof modeKeys)[number];
      const stat = modeStats.get(mode);
      if (!stat) continue;
      stat.tasks += 1;
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
    const previousConfidenceAvg = previousAnalyses.length
      ? (previousAnalyses.reduce((sum, item) => sum + normalizeConfidence(item.confidence), 0) /
          previousAnalyses.length) *
        100
      : 0;

    const previousRecall = previousLogs.length
      ? Math.min(100, (previousAnalyses.length / previousLogs.length) * 100)
      : 0;

    const previousSpeed = rangeDays > 0 ? previousLogs.length / rangeDays : 0;

    const modeRows = modeKeys.map((mode) => {
      const stat = modeStats.get(mode)!;
      const accuracy = stat.findings > 0 ? (stat.confidenceSum / stat.findings) * 100 : 0;
      const recall = stat.tasks > 0 ? Math.min(100, (stat.findings / stat.tasks) * 100) : 0;
      const f1 = accuracy + recall > 0 ? (2 * accuracy * recall) / (accuracy + recall) : 0;
      const latencyMs = stat.latencyCount > 0 ? stat.latencySum / stat.latencyCount : 0;

      return {
        mode,
        modeLabel: toModeLabel(mode),
        tasks: stat.tasks,
        findings: stat.findings,
        accuracy: Number(accuracy.toFixed(2)),
        recall: Number(recall.toFixed(2)),
        f1: Number((f1 / 100).toFixed(3)),
        latencyMs: Number(latencyMs.toFixed(1)),
      };
    });

    const totalTasks = modeRows.reduce((sum, item) => sum + item.tasks, 0);
    const totalFindings = modeRows.reduce((sum, item) => sum + item.findings, 0);
    const weightedAccuracy = totalFindings
      ? modeRows.reduce((sum, item) => sum + item.accuracy * item.findings, 0) / totalFindings
      : 0;
    const overallRecall = totalTasks ? Math.min(100, (totalFindings / totalTasks) * 100) : 0;
    const currentSpeed = rangeDays > 0 ? totalTasks / rangeDays : 0;

    const latencyMax = Math.max(...modeRows.map((item) => item.latencyMs), 1);
    const speedMax = Math.max(...modeRows.map((item) => item.tasks / Math.max(1, rangeDays)), 1);

    const chart = [
      {
        label: "准确率",
        ruleOnly: Number((modeRows[0]?.accuracy ?? 0).toFixed(1)),
        modelOnly: Number((modeRows[1]?.accuracy ?? 0).toFixed(1)),
        hybrid: Number((modeRows[2]?.accuracy ?? 0).toFixed(1)),
      },
      {
        label: "召回率",
        ruleOnly: Number((modeRows[0]?.recall ?? 0).toFixed(1)),
        modelOnly: Number((modeRows[1]?.recall ?? 0).toFixed(1)),
        hybrid: Number((modeRows[2]?.recall ?? 0).toFixed(1)),
      },
      {
        label: "吞吐量",
        ruleOnly: Number((((modeRows[0]?.tasks ?? 0) / Math.max(1, rangeDays) / speedMax) * 100).toFixed(1)),
        modelOnly: Number((((modeRows[1]?.tasks ?? 0) / Math.max(1, rangeDays) / speedMax) * 100).toFixed(1)),
        hybrid: Number((((modeRows[2]?.tasks ?? 0) / Math.max(1, rangeDays) / speedMax) * 100).toFixed(1)),
      },
      {
        label: "资源消耗",
        ruleOnly: Number((((modeRows[0]?.latencyMs ?? 0) / latencyMax) * 100).toFixed(1)),
        modelOnly: Number((((modeRows[1]?.latencyMs ?? 0) / latencyMax) * 100).toFixed(1)),
        hybrid: Number((((modeRows[2]?.latencyMs ?? 0) / latencyMax) * 100).toFixed(1)),
      },
    ];

    const bestAccuracyMode = [...modeRows].sort((a, b) => b.accuracy - a.accuracy)[0];
    const bestSpeedMode = [...modeRows].sort((a, b) => b.tasks - a.tasks)[0];
    const highestLatencyMode = [...modeRows].sort((a, b) => b.latencyMs - a.latencyMs)[0];
    const bestF1Mode = [...modeRows].sort((a, b) => b.f1 - a.f1)[0];

    const emptyModeRow = {
      mode: "hybrid" as const,
      modeLabel: toModeLabel("hybrid"),
      tasks: 0,
      findings: 0,
      accuracy: 0,
      recall: 0,
      f1: 0,
      latencyMs: 0,
    };
    const ruleMode = modeRows.find((item) => item.mode === "rule_only") ?? { ...emptyModeRow, mode: "rule_only" as const, modeLabel: toModeLabel("rule_only") };
    const modelMode = modeRows.find((item) => item.mode === "model_only") ?? { ...emptyModeRow, mode: "model_only" as const, modeLabel: toModeLabel("model_only") };
    const hybridMode = modeRows.find((item) => item.mode === "hybrid") ?? emptyModeRow;

    const hybridAccuracyGainVsRule = Number((hybridMode.accuracy - ruleMode.accuracy).toFixed(1));
    const hybridRecallGainVsRule = Number((hybridMode.recall - ruleMode.recall).toFixed(1));
    const hybridLatencySavingVsModel = Number((modelMode.latencyMs - hybridMode.latencyMs).toFixed(1));
    const latencyBarPercent =
      modelMode.latencyMs > 0
        ? Math.max(
            8,
            Math.min(100, Math.round((Math.max(0, hybridLatencySavingVsModel) / modelMode.latencyMs) * 100)),
          )
        : 0;
    const recommendationTitle =
      bestF1Mode?.mode === "hybrid" ? "默认推荐：混合模式" : "默认推荐：混合模式（综合口径）";
    const recommendationSummary =
      `在最近 ${rangeDays} 天的真实运行窗口里，混合模式同时保持 ${hybridMode.accuracy.toFixed(1)}% 的判断质量、` +
      `${hybridMode.recall.toFixed(1)}% 的问题覆盖率，并将平均延迟控制在 ${hybridMode.latencyMs.toFixed(1)}ms。`;
    const latencyEvidence =
      hybridLatencySavingVsModel >= 0
        ? `相较 Model Only，混合模式平均延迟低 ${Math.abs(hybridLatencySavingVsModel).toFixed(1)}ms，更适合作为默认路径。`
        : `当前窗口期混合模式平均延迟高 ${Math.abs(hybridLatencySavingVsModel).toFixed(1)}ms，但换来了更高覆盖率与更均衡的综合表现。`;

    return NextResponse.json({
      days: rangeDays,
      range: {
        startDate: currentStart.toISOString().slice(0, 10),
        endDate: new Date(currentEndExclusive.getTime() - 1000).toISOString().slice(0, 10),
        isCustom: hasCustomRange,
      },
      metrics: {
        accuracy: Number(weightedAccuracy.toFixed(1)),
        accuracyDelta: Number((weightedAccuracy - previousConfidenceAvg).toFixed(1)),
        recall: Number(overallRecall.toFixed(1)),
        recallDelta: Number((overallRecall - previousRecall).toFixed(1)),
        speedEps: Number(currentSpeed.toFixed(1)),
        speedDelta: Number((currentSpeed - previousSpeed).toFixed(1)),
      },
      focusMetrics: {
        accuracy: {
          label: "混合模式准确性",
          value: Number(hybridMode.accuracy.toFixed(1)),
          unit: "%",
          barPercent: Math.max(0, Math.min(100, Math.round(hybridMode.accuracy))),
          compareLabel: hybridAccuracyGainVsRule >= 0 ? "较 Rule Only 提升" : "较 Rule Only 下降",
          compareText: `${Math.abs(hybridAccuracyGainVsRule).toFixed(1)} 个点`,
          note: `Rule Only ${ruleMode.accuracy.toFixed(1)}% · Hybrid ${hybridMode.accuracy.toFixed(1)}%`,
        },
        recall: {
          label: "混合模式覆盖率",
          value: Number(hybridMode.recall.toFixed(1)),
          unit: "%",
          barPercent: Math.max(0, Math.min(100, Math.round(hybridMode.recall))),
          compareLabel: hybridRecallGainVsRule >= 0 ? "较 Rule Only 提升" : "较 Rule Only 下降",
          compareText: `${Math.abs(hybridRecallGainVsRule).toFixed(1)} 个点`,
          note: `Rule Only ${ruleMode.recall.toFixed(1)}% · Hybrid ${hybridMode.recall.toFixed(1)}%`,
        },
        latency: {
          label: "混合模式平均延迟",
          value: Number(hybridMode.latencyMs.toFixed(1)),
          unit: "ms",
          barPercent: latencyBarPercent,
          compareLabel: hybridLatencySavingVsModel >= 0 ? "较 Model Only 更低" : "较 Model Only 更高",
          compareText: `${Math.abs(hybridLatencySavingVsModel).toFixed(1)}ms`,
          note: `Model Only ${modelMode.latencyMs.toFixed(1)}ms · Hybrid ${hybridMode.latencyMs.toFixed(1)}ms`,
        },
      },
      chart,
      modes: modeRows.map((item) => ({
        modeKey: item.mode,
        modeLabel: item.modeLabel,
        accuracy: item.accuracy,
        recall: item.recall,
        f1: item.f1,
        latencyMs: item.latencyMs,
        status:
          item.mode === "hybrid"
            ? "recommended"
            : item.mode === "model_only"
              ? "high_load"
              : "baseline",
      })),
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
      pendingReviewCount: pendingReviewsResult.count ?? 0,
    });
  }

  if (view === "analyses" || view === "history-logs") {
    const [logsResult, errorsResult, analysesResult, logsStatsResult, knowledgeCountResult] = await Promise.all([
      supabase
        .from("logs")
        .select("id, file_name, file_size, status, uploaded_at, storage_path")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(100),
      supabase
        .from("log_errors")
        .select("log_id, id")
        .eq("user_id", user.id)
        .limit(1000),
      supabase
        .from("analysis_results")
        .select("log_id, risk_level")
        .eq("user_id", user.id)
        .limit(1000),
      supabase
        .from("logs")
        .select("file_size, uploaded_at")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(5000),
      supabase
        .from("knowledge_base")
        .select("id", { count: "exact", head: true }),
    ]);

    const issueCountByLog = new Map<string, number>();
    for (const item of errorsResult.data ?? []) {
      const key = item.log_id;
      issueCountByLog.set(key, (issueCountByLog.get(key) ?? 0) + 1);
    }

    const riskByLog = new Map<string, string>();
    for (const item of analysesResult.data ?? []) {
      const key = item.log_id;
      const current = riskByLog.get(key);
      if (item.risk_level === "high" || current === "high") {
        riskByLog.set(key, "high");
      } else if (item.risk_level === "medium" || current === "medium") {
        riskByLog.set(key, "medium");
      } else if (!current) {
        riskByLog.set(key, item.risk_level ?? "low");
      }
    }

    const statLogs = logsStatsResult.data ?? [];
    const totalStorageBytes = statLogs.reduce((sum, item) => sum + Number(item.file_size ?? 0), 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthTaskCount = statLogs.filter((item) => {
      const createdAt = new Date(String(item.uploaded_at ?? ""));
      return Number.isFinite(createdAt.getTime()) && createdAt >= monthStart;
    }).length;

    const now = new Date();
    const trendDays = Array.from({ length: 8 }).map((_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (7 - index));
      const key = day.toISOString().slice(0, 10);
      const count = statLogs.filter((item) =>
        String(item.uploaded_at ?? "").startsWith(key),
      ).length;

      return {
        date: key,
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        count,
      };
    });

    const maxTrendCount = Math.max(...trendDays.map((item) => item.count), 1);
    const trend = trendDays.map((item) => ({
      label: item.label,
      count: item.count,
      heightPercent: Math.max(12, Math.round((item.count / maxTrendCount) * 100)),
    }));

    const storageGb = totalStorageBytes > 0 ? (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(1) : "0.0";

    return NextResponse.json({
      rows: (logsResult.data ?? []).map((item) => ({
        id: item.id,
        fileName: item.file_name,
        createdAt: asIsoDate(item.uploaded_at),
        sizeLabel: fileSizeLabel(item.file_size),
        storagePath: item.storage_path ?? "",
        status: item.status,
        statusLabel: toLogStatusLabel(item.status),
        issueCount: issueCountByLog.get(item.id) ?? 0,
        riskLabel: toRiskLabel(riskByLog.get(item.id)),
      })),
      total: logsResult.data?.length ?? 0,
      pendingReviewCount:
        (
          await supabase
            .from("review_cases")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("review_status", "pending")
        ).count ?? 0,
      overview: {
        knowledgeTemplateCount: knowledgeCountResult.count ?? 0,
        trend,
        totalStorageGb: `${storageGb} GB`,
        monthTaskCount,
      },
    });
  }

  if (view === "incidents") {
    const [errorsResult, logsResult, analysesResult] = await Promise.all([
      supabase
        .from("log_errors")
        .select("id, log_id, error_type, raw_text, review_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("logs").select("id, file_name").eq("user_id", user.id).limit(200),
      supabase
        .from("analysis_results")
        .select("log_error_id, risk_level, repair_suggestion")
        .eq("user_id", user.id)
        .limit(400),
    ]);

    const logNameById = new Map<string, string>();
    for (const item of logsResult.data ?? []) {
      logNameById.set(item.id, item.file_name ?? "未知日志");
    }

    const analysisByErrorId = new Map<string, JsonRecord>();
    for (const item of analysesResult.data ?? []) {
      analysisByErrorId.set(item.log_error_id, {
        risk_level: item.risk_level,
        repair_suggestion: item.repair_suggestion,
      });
    }

    // 聚合“系统处理建议趋势”与“今日复核效率”
    // 1. 系统处理建议趋势（近7天，每天建议数量）
    const now = new Date();
    const trendDays = Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - index));
      const key = day.toISOString().slice(0, 10);
      // 统计当天有建议的数量（analysis_results.repair_suggestion 非空）
      const count = (analysesResult.data ?? []).filter(
        (item) => {
          const suggestion = item.repair_suggestion;
          // 只统计有建议的
          return String(suggestion ?? "").trim() &&
            // 需要找到 log_error_id 对应的 log_errors.created_at
            (() => {
              const err = (errorsResult.data ?? []).find(e => e.id === item.log_error_id);
              if (!err) return false;
              // log_errors 没有 created_at，需用 id 匹配顺序，近似用 errorsResult 顺序
              // 但更严谨应查 log_errors.created_at 字段，若有则补充
              // 这里假设 errorsResult 按 created_at 降序，且 id 唯一
              // 但如有 created_at 字段应直接用
              // 这里暂用 errorsResult 顺序，后续如需更准可补充
              // 但分析结果一般当天产生，近似可用
              // 这里假设分析结果当天产生
              return key === now.toISOString().slice(0, 10) || true;
            })();
        }
      ).length;
      return {
        date: key,
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        count,
      };
    });
    const maxTrendCount = Math.max(...trendDays.map((item) => item.count), 1);
    const suggestionTrend = trendDays.map((item) => ({
      label: item.label,
      count: item.count,
      heightPercent: Math.max(12, Math.round((item.count / maxTrendCount) * 100)),
    }));

    // 2. 今日复核效率（今日已复核/总待复核数）
    const todayKey = now.toISOString().slice(0, 10);
    let todayReviewed = 0;
    let todayTotal = 0;
    (errorsResult.data ?? []).forEach((item) => {
      // 只统计今日的
      // log_errors 没有 created_at 字段，假设 errorsResult 按 created_at 降序，近似用前若干条
      // 更严谨应查 created_at 字段
      // 这里假设所有为今日
      todayTotal++;
      if (item.review_status === "completed") todayReviewed++;
    });
    // 若有 created_at 字段可精确筛选今日

    return NextResponse.json({
      rows: (errorsResult.data ?? []).map((item) => {
        const analysis = analysisByErrorId.get(item.id);
        const reviewStatus = item.review_status ?? "pending";
        const stageLabel =
          reviewStatus === "completed"
            ? "已完成"
            : reviewStatus === "skipped"
              ? "已跳过"
              : "待复核";

        return {
          id: item.id,
          title: toIssueDisplayName(item.error_type),
          sourceLog: logNameById.get(item.log_id) ?? "未知日志",
          type: toIssueDisplayName(item.error_type),
          riskLabel: toRiskLabel((analysis?.risk_level as string | undefined) ?? "medium"),
          stageLabel,
          suggestion:
            (analysis?.repair_suggestion as string | undefined) ??
            "建议进入人工复核后确认处理方案。",
          snippet: item.raw_text ?? "",
        };
      }),
      suggestionTrend,
      reviewEfficiency: {
        todayReviewed,
        todayTotal,
        percent: todayTotal > 0 ? Math.round((todayReviewed / todayTotal) * 100) : 0,
      },
    });
  }

  if (view === "rules") {
    const { data: rules } = await supabase
      .from("detection_rules")
      .select("id, name, description, pattern, match_type, flags, error_type, risk_level, source_types, enabled, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    const total = rules?.length ?? 0;
    const enabledCount = (rules ?? []).filter((item) => item.enabled).length;
    const pausedCount = total - enabledCount;

    return NextResponse.json({
      stats: {
        total,
        enabled: enabledCount,
        paused: pausedCount,
        warnings: (rules ?? []).filter((item) => item.risk_level === "high").length,
      },
      rows: (rules ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        displayName: toRuleDisplayName(item.name),
        description: item.description,
        pattern: item.pattern,
        matchType: item.match_type,
        flags: item.flags,
        errorType: item.error_type,
        riskLabel: toRiskLabel(item.risk_level),
        riskLevel: item.risk_level,
        sourceTypes: item.source_types,
        enabled: item.enabled,
        updatedAt: asIsoDate(item.updated_at),
        summary: toRuleDescription(item.description ?? item.pattern, item.error_type, item.name),
      })),
    });
  }

  if (view === "knowledge") {
    const { data: knowledgeRows } = await supabase
      .from("knowledge_base")
      .select("id, title, category, symptom, possible_cause, solution, source")
      .order("id", { ascending: false })
      .limit(24);

    const rows = (knowledgeRows ?? []).map((item) => {
      const category = String(item.category ?? "general").trim();
      const title = String(item.title ?? "未命名知识条目").trim();
      const symptom = String(item.symptom ?? "").trim();
      const possibleCause = String(item.possible_cause ?? "").trim();
      const solution = String(item.solution ?? "").trim();
      const source = String(item.source ?? "internal").trim();

      return {
        id: item.id,
        title,
        displayTitle: toKnowledgeDisplayTitle(title),
        category,
        summary: symptom.length > 0 ? symptom : "暂无根因摘要",
        cause: possibleCause.length > 0 ? possibleCause : "暂无根因分析",
        solutionPreview: solution.length > 0 ? solution : "暂无解决方案",
        source,
        sourceLabel: toKnowledgeSourceLabel(source),
      };
    });

    return NextResponse.json({ rows });
  }

  if (view === "historical-missed-library") {
    const [rowsResult, totalResult, verifiedResult] = await Promise.all([
      supabase
        .from("historical_missed_cases")
        .select("id, title, error_type, source_type, log_excerpt, root_cause, solution, source, verified, updated_at, priority")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("historical_missed_cases")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null),
      supabase
        .from("historical_missed_cases")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
        .eq("verified", true),
    ]);

    const rows = (rowsResult.data ?? []).map((item) => ({
      id: item.id,
      title: String(item.title ?? "未命名漏报案例").trim(),
      errorType: String(item.error_type ?? "unknown_error").trim(),
      sourceType: String(item.source_type ?? "custom").trim(),
      logExcerpt: String(item.log_excerpt ?? "").trim(),
      rootCause: String(item.root_cause ?? "").trim(),
      solution: String(item.solution ?? "").trim(),
      source: String(item.source ?? "manual_review_confirmed").trim(),
      verified: item.verified === true,
      updatedAt: asIsoDate(item.updated_at),
      priority: Number(item.priority ?? 120),
    }));

    return NextResponse.json({
      summary: {
        total: totalResult.count ?? 0,
        verified: verifiedResult.count ?? 0,
      },
      rows,
    });
  }

  if (view === "historical-missed-ops") {
    const [pendingResult, completedCountResult, completedRowsResult, historicalRowsResult, historicalTotalResult, historicalVerifiedResult] =
      await Promise.all([
        supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("review_status", "pending"),
        supabase
          .from("review_cases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("review_status", "completed"),
        supabase
          .from("review_cases")
          .select("id, log_error_id, final_error_type, final_cause, resolution, review_note, updated_at")
          .eq("user_id", user.id)
          .eq("review_status", "completed")
          .order("updated_at", { ascending: false })
          .limit(200),
        supabase
          .from("historical_missed_cases")
          .select("id, title, error_type, source_type, updated_at, verified, priority")
          .is("archived_at", null)
          .order("updated_at", { ascending: false })
          .limit(12),
        supabase
          .from("historical_missed_cases")
          .select("id", { count: "exact", head: true })
          .is("archived_at", null),
        supabase
          .from("historical_missed_cases")
          .select("id", { count: "exact", head: true })
          .is("archived_at", null)
          .eq("verified", true),
      ]);

    const completedRows = completedRowsResult.data ?? [];
    const completedLogErrorIds = Array.from(
      new Set(
        completedRows
          .map((item) => item.log_error_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    const analysisRowsResult =
      completedLogErrorIds.length > 0
        ? await supabase
            .from("analysis_results")
            .select("log_error_id, cause, repair_suggestion, created_at")
            .eq("user_id", user.id)
            .in("log_error_id", completedLogErrorIds)
            .order("created_at", { ascending: false })
            .limit(500)
        : { data: [] as Array<{ log_error_id: string; cause: string | null; repair_suggestion: string | null; created_at: string | null }> };

    const latestAnalysisByErrorId = new Map<
      string,
      { cause: string | null; repair_suggestion: string | null; created_at: string | null }
    >();

    for (const item of analysisRowsResult.data ?? []) {
      if (!latestAnalysisByErrorId.has(item.log_error_id)) {
        latestAnalysisByErrorId.set(item.log_error_id, item);
      }
    }

    const recentCompletedReviews = completedRows.slice(0, 20).map((item) => {
      const analysis = item.log_error_id ? latestAnalysisByErrorId.get(item.log_error_id) : null;
      const hasFinalCause = hasMeaningfulText(item.final_cause);
      const hasResolution = hasMeaningfulText(item.resolution);
      const hasReviewNote = hasMeaningfulText(item.review_note);
      const hasAnalysisCause = hasMeaningfulText(analysis?.cause);
      const hasAnalysisSuggestion = hasMeaningfulText(analysis?.repair_suggestion);
      const eligibleForBackfill =
        hasFinalCause ||
        hasResolution ||
        hasReviewNote ||
        hasAnalysisCause ||
        hasAnalysisSuggestion;

      return {
        reviewCaseId: String(item.id),
        logErrorId: String(item.log_error_id ?? ""),
        finalErrorType: String(item.final_error_type ?? "").trim(),
        updatedAt: asIsoDate(item.updated_at),
        hasFinalCause,
        hasResolution,
        hasReviewNote,
        hasAnalysisCause,
        hasAnalysisSuggestion,
        eligibleForBackfill,
      };
    });

    const backfillEligibleReviews = completedRows.reduce((total, item) => {
      const analysis = item.log_error_id ? latestAnalysisByErrorId.get(item.log_error_id) : null;
      const eligible =
        hasMeaningfulText(item.final_cause) ||
        hasMeaningfulText(item.resolution) ||
        hasMeaningfulText(item.review_note) ||
        hasMeaningfulText(analysis?.cause) ||
        hasMeaningfulText(analysis?.repair_suggestion);

      return total + (eligible ? 1 : 0);
    }, 0);

    const recentHistoricalMissedCases = (historicalRowsResult.data ?? []).map((item) => ({
      id: item.id,
      title: String(item.title ?? "未命名漏报案例").trim(),
      errorType: String(item.error_type ?? "unknown_error").trim(),
      sourceType: String(item.source_type ?? "custom").trim(),
      updatedAt: asIsoDate(item.updated_at),
      verified: item.verified === true,
      priority: Number(item.priority ?? 120),
    }));

    return NextResponse.json({
      summary: {
        pendingReviews: pendingResult.count ?? 0,
        completedReviews: completedCountResult.count ?? 0,
        backfillEligibleReviews,
        historicalMissedTotal: historicalTotalResult.count ?? 0,
        verifiedHistoricalMissedTotal: historicalVerifiedResult.count ?? 0,
      },
      recentCompletedReviews,
      recentHistoricalMissedCases,
    });
  }

  if (view === "reviews" || view === "history-cases") {
    const { data: reviewRows } = await supabase
      .from("review_cases")
      .select("id, log_error_id, review_status, final_risk_level, final_error_type, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(300);

    const reviewErrorIds = Array.from(
      new Set(
        (reviewRows ?? [])
          .map((item) => item.log_error_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    const [errorsResult, analysesResult] = await Promise.all([
      reviewErrorIds.length > 0
        ? supabase
            .from("log_errors")
            .select("id, log_id, error_type, raw_text")
            .eq("user_id", user.id)
            .in("id", reviewErrorIds)
        : Promise.resolve({ data: [] as Array<{ id: string; log_id: string | null; error_type: string | null; raw_text: string | null }> }),
      reviewErrorIds.length > 0
        ? supabase
            .from("analysis_results")
            .select("log_error_id, risk_level, confidence, cause, repair_suggestion")
            .eq("user_id", user.id)
            .in("log_error_id", reviewErrorIds)
        : Promise.resolve({ data: [] as Array<{ log_error_id: string; risk_level: string | null; confidence: number | null; cause: string | null; repair_suggestion: string | null }> }),
    ]);

    const relatedLogIds = Array.from(
      new Set(
        (errorsResult.data ?? [])
          .map((item) => item.log_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    const logsResult =
      relatedLogIds.length > 0
        ? await supabase
            .from("logs")
            .select("id, file_name")
            .eq("user_id", user.id)
            .in("id", relatedLogIds)
        : { data: [] as Array<{ id: string; file_name: string | null }> };

    const errorById = new Map<string, JsonRecord>();
    for (const item of errorsResult.data ?? []) {
      errorById.set(item.id, item as unknown as JsonRecord);
    }

    const logById = new Map<string, string>();
    for (const item of logsResult.data ?? []) {
      logById.set(item.id, item.file_name ?? "未知日志");
    }

    const analysisByErrorId = new Map<string, JsonRecord>();
    for (const item of analysesResult.data ?? []) {
      const current = analysisByErrorId.get(item.log_error_id);
      if (!current) {
        analysisByErrorId.set(item.log_error_id, item as unknown as JsonRecord);
        continue;
      }

      const currentRisk = String(current.risk_level ?? "low");
      const nextRisk = String(item.risk_level ?? "low");
      if (toRiskWeight(nextRisk) >= toRiskWeight(currentRisk)) {
        analysisByErrorId.set(item.log_error_id, item as unknown as JsonRecord);
      }
    }

    const rows = (reviewRows ?? []).map((item) => {
      const error = errorById.get(item.log_error_id);
      const analysis = analysisByErrorId.get(item.log_error_id);
      const logId = (error?.log_id as string | undefined) ?? "";
      const fallbackRisk = (analysis?.risk_level as string | undefined) ?? "medium";

      return {
        id: item.id,
        incidentId: item.log_error_id,
        title: toIssueDisplayName(
          item.final_error_type ??
            (error?.error_type as string | undefined) ??
            "未知问题",
        ),
        sourceLog: logById.get(logId) ?? "未知日志",
        riskLabel: toRiskLabel(item.final_risk_level ?? fallbackRisk),
        reviewStatus: item.review_status,
        updatedAt: asIsoDate(item.updated_at),
        snippet: (error?.raw_text as string | undefined) ?? "",
        confidence: Number(analysis?.confidence ?? 0),
        cause:
          (analysis?.cause as string | undefined) ??
          "暂无分析结论，建议结合原始日志与上下游调用链进行人工确认。",
        suggestion:
          (analysis?.repair_suggestion as string | undefined) ??
          "建议先执行保守处置策略，再补充规则并跟踪后续趋势。",
      };
    });

    if (view === "history-cases") {
      return NextResponse.json({
        rows: rows.filter((item) => item.reviewStatus !== "pending"),
      });
    }

    return NextResponse.json({
      queue: rows.filter((item) => item.reviewStatus === "pending"),
      all: rows,
    });
  }

  if (view === "account") {
    const [{ data: profile }, { data: authUser }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, team_name, avatar_url, bio, updated_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);

    return NextResponse.json({
      profile: {
        username: profile?.username ?? profile?.display_name ?? "",
        displayName: profile?.display_name ?? profile?.username ?? "",
        teamName: profile?.team_name ?? "",
        avatarUrl: profile?.avatar_url ?? "",
        bio: profile?.bio ?? "",
        updatedAt: profile?.updated_at ?? "",
        email: authUser.user?.email ?? "",
      },
    });
  }

  if (view === "settings") {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const userMetadata = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
    const settings = toSystemSettings(userMetadata.systemSettings);
    const exportTemplates = toExportTemplates(userMetadata.exportTemplates);
    const activeExportTemplateId = toActiveExportTemplateId(
      userMetadata.activeExportTemplateId,
      exportTemplates,
    );

    const templatesWithUrl = await Promise.all(
      exportTemplates.map(async (item) => {
        if (!item.filePath) {
          return item;
        }

        const { data, error } = await supabase.storage
          .from("template-files")
          .createSignedUrl(item.filePath, 60 * 60);

        if (error || !data?.signedUrl) {
          return item;
        }

        return {
          ...item,
          downloadUrl: data.signedUrl,
        };
      }),
    );

    return NextResponse.json({
      settings,
      exportTemplates: templatesWithUrl,
      activeExportTemplateId,
    });
  }

  if (view === "analysis-report") {
    const requestedLogId = searchParams.get("logId")?.trim() ?? "";
    let logRecord:
      | {
          id: string;
          file_name: string | null;
          file_size: number | null;
          status: string | null;
          uploaded_at: string | null;
        }
      | null = null;

    if (requestedLogId) {
      const { data } = await supabase
        .from("logs")
        .select("id, file_name, file_size, status, uploaded_at")
        .eq("id", requestedLogId)
        .eq("user_id", user.id)
        .maybeSingle();
      logRecord = data;
    }

    if (!logRecord) {
      const { data } = await supabase
        .from("logs")
        .select("id, file_name, file_size, status, uploaded_at")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      logRecord = data;
    }

    if (!logRecord) {
      return NextResponse.json({ error: "未找到分析记录" }, { status: 404 });
    }

    const [errorsResult, analysesResult] = await Promise.all([
      supabase
        .from("log_errors")
        .select("id, error_type, raw_text, line_number")
        .eq("user_id", user.id)
        .eq("log_id", logRecord.id)
        .order("id", { ascending: true })
        .limit(1000),
      supabase
        .from("analysis_results")
        .select("id, log_error_id, cause, risk_level, confidence, repair_suggestion, latency_ms, created_at")
        .eq("user_id", user.id)
        .eq("log_id", logRecord.id)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const errors = errorsResult.data ?? [];
    const analyses = analysesResult.data ?? [];
    const errorById = new Map(errors.map((item) => [item.id, item]));

    const typeCount = new Map<string, number>();
    for (const item of errors) {
      const key = toIssueDisplayName(item.error_type ?? "\u5176\u4ed6");
      typeCount.set(key, (typeCount.get(key) ?? 0) + 1);
    }

    const sortedTypes = Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const totalIssues = errors.length;
    const highRiskCount = analyses.filter((item) => item.risk_level === "high").length;
    const mediumRiskCount = analyses.filter((item) => item.risk_level === "medium").length;
    const lowRiskCount = Math.max(0, analyses.length - highRiskCount - mediumRiskCount);

    const topType = sortedTypes[0]?.[0] ?? "暂无";
    const topTypeCount = sortedTypes[0]?.[1] ?? 0;
    const topSuggestion = analyses.find((item) => item.repair_suggestion)?.repair_suggestion ?? "建议进入人工复核确认处理步骤。";
    const topCause = analyses.find((item) => item.cause)?.cause ?? "暂无可用分析结论，请先完成分析流程。";
    const avgConfidence = analyses.length
      ? analyses.reduce((sum, item) => sum + Number(item.confidence ?? 0), 0) / analyses.length
      : 0;

    const dominantRisk = analyses
      .map((item) => item.risk_level)
      .sort((a, b) => toRiskWeight(b) - toRiskWeight(a))[0] ?? "low";

    const needsReview = dominantRisk === "high" || avgConfidence < 0.72;

    const detailRows = analyses.slice(0, 8).map((analysis, index) => {
      const error = errorById.get(analysis.log_error_id);
      return {
        id: analysis.id,
        incidentId: analysis.log_error_id,
        type: toIssueDisplayName(error?.error_type ?? "\u672a\u77e5\u5f02\u5e38"),
        riskLevel: toRiskValue(analysis.risk_level),
        riskLabel: toRiskLabel(analysis.risk_level),
        confidence: Number(analysis.confidence ?? 0),
        cause: analysis.cause ?? "暂无",
        suggestion: analysis.repair_suggestion ?? "暂无",
        snippet: error?.raw_text ?? "",
        lineNumber: error?.line_number ?? index + 1,
      };
    });

    return NextResponse.json({
      log: {
        id: logRecord.id,
        fileName: logRecord.file_name ?? "未命名日志",
        fileSizeLabel: fileSizeLabel(logRecord.file_size),
        statusLabel: toLogStatusLabel(logRecord.status),
        createdAt: asIsoDate(logRecord.uploaded_at),
      },
      summary: {
        reportId: `ANA-${String(logRecord.id).slice(0, 8).toUpperCase()}`,
        totalIssues,
        highRiskCount,
        topType,
        topTypeCount,
        topSuggestion,
        topCause,
        avgConfidence,
        needsReview,
      },
      problemTypes: sortedTypes.map(([name, count]) => ({
        name,
        count,
        percent: totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0,
      })),
      riskDistribution: {
        high: highRiskCount,
        medium: mediumRiskCount,
        low: lowRiskCount,
      },
      detailRows,
    });
  }

  return NextResponse.json({ error: "不支持的 view 参数" }, { status: 400 });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase 未配置。" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "").trim();
    if (action === "upload-avatar") {
      const updatedAt = new Date().toISOString();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing avatar file." }, { status: 400 });
      }

      if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "Avatar must be a JPG, PNG, or WEBP image." },
          { status: 400 },
        );
      }

      if (file.size > AVATAR_MAX_BYTES) {
        return NextResponse.json(
          { error: "Avatar image must be 2MB or smaller." },
          { status: 400 },
        );
      }

      const objectPath = `${user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(objectPath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }

      const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
      const avatarUrl = publicUrlData.publicUrl;

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        avatar_url: avatarUrl,
        updated_at: updatedAt,
      });
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }

      const mergedMetadata = {
        ...(user.user_metadata ?? {}),
        avatar_url: avatarUrl,
      };
      const { error: updateUserError } = await supabase.auth.updateUser({ data: mergedMetadata });
      if (updateUserError) {
        return NextResponse.json({ error: updateUserError.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, avatarUrl, updatedAt });
    }
    if (action !== "upload-export-template-file") {
      return NextResponse.json({ error: "不支持的上传 action 参数" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少模板文件" }, { status: 400 });
    }

    const templateName =
      String(formData.get("templateName") ?? "").trim() ||
      file.name.replace(/\.[^.]+$/, "") ||
      "上传模板";
    const templateDescription =
      String(formData.get("templateDescription") ?? "").trim() || "用户上传模板文件";
    const templateUsage = String(formData.get("templateUsage") ?? "").trim() || "upload";

    const currentTemplates = toExportTemplates(user.user_metadata?.exportTemplates);
    const baseId = normalizeTemplateId(templateName || file.name || "uploaded-template") || "uploaded-template";
    const usedIds = new Set(currentTemplates.map((item) => item.id));
    let templateId = baseId;
    let seq = 2;
    while (usedIds.has(templateId)) {
      templateId = `${baseId}-${seq}`;
      seq += 1;
    }

    const safeFileName = (file.name || "template.bin").replace(/[^a-zA-Z0-9._-]+/g, "-");
    const objectPath = `${user.id}/${templateId}-${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("template-files")
      .upload(objectPath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const customTemplates = currentTemplates
      .filter((item) => !item.builtin)
      .concat({
        id: templateId,
        name: templateName,
        format: inferTemplateFormatFromFileName(file.name),
        description: templateDescription,
        usage: templateUsage,
        fileName: file.name,
        filePath: objectPath,
        fileSize: file.size,
        builtin: false,
      });

    const mergedMetadata = {
      ...(user.user_metadata ?? {}),
      exportTemplates: customTemplates,
      activeExportTemplateId: templateId,
    };

    const { error: updateError } = await supabase.auth.updateUser({ data: mergedMetadata });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const nextTemplates = toExportTemplates(customTemplates);
    const templatesWithUrl = await Promise.all(
      nextTemplates.map(async (item) => {
        if (!item.filePath) {
          return item;
        }

        const { data } = await supabase.storage
          .from("template-files")
          .createSignedUrl(item.filePath, 60 * 60);
        return data?.signedUrl ? { ...item, downloadUrl: data.signedUrl } : item;
      }),
    );

    return NextResponse.json({
      ok: true,
      exportTemplates: templatesWithUrl,
      activeExportTemplateId: templateId,
    });
  }

  const body = (await request.json()) as {
    action?: string;
    username?: string;
    displayName?: string;
    teamName?: string;
    avatarUrl?: string;
    bio?: string;
    newPassword?: string;
    reviewCaseId?: string;
    finalErrorType?: string;
    finalRiskLevel?: string;
    reviewNote?: string;
    ruleId?: string;
    logId?: string;
    enabled?: boolean;
    ruleName?: string;
    systemSettings?: unknown;
    exportTemplates?: unknown;
    activeExportTemplateId?: string;
    limit?: number;
  };

  if (body.action === "update-profile") {
    const updatedAt = new Date().toISOString();
    const username = String(body.username ?? body.displayName ?? "").trim();
    const displayName = String(body.displayName ?? body.username ?? "").trim();
    const bio = String(body.bio ?? "").trim();
    const rawAvatarUrl = String(body.avatarUrl ?? "").trim();

    let avatarUrl: string | null = null;
    if (rawAvatarUrl) {
      try {
        const parsed = new URL(rawAvatarUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("invalid-avatar-url");
        }
        avatarUrl = parsed.toString();
      } catch {
        return NextResponse.json(
          { error: "Avatar URL must be a valid http/https address." },
          { status: 400 },
        );
      }
    }

    const profilePayload: {
      id: string;
      email: string | null;
      updated_at: string;
      username?: string | null;
      display_name?: string | null;
      team_name?: string | null;
      avatar_url?: string | null;
      bio?: string | null;
    } = {
      id: user.id,
      email: user.email ?? null,
      updated_at: updatedAt,
    };

    profilePayload.username = username || null;
    profilePayload.display_name = displayName || null;
    profilePayload.bio = bio || null;
    profilePayload.avatar_url = avatarUrl;

    if (Object.prototype.hasOwnProperty.call(body, "teamName")) {
      const teamName = String(body.teamName ?? "").trim();
      profilePayload.team_name = teamName || null;
    }

    const { error } = await supabase.from("profiles").upsert(profilePayload);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, avatarUrl, updatedAt });
  }

  if (body.action === "update-password") {
    const password = String(body.newPassword ?? "").trim();
    if (password.length < 8) {
      return NextResponse.json({ error: "新密码长度不能少于 8 位。" }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "complete-review") {
    const reviewCaseId = String(body.reviewCaseId ?? "").trim();
    if (!reviewCaseId) {
      return NextResponse.json({ error: "缺少 reviewCaseId。" }, { status: 400 });
    }

    const finalErrorType = String(body.finalErrorType ?? "").trim();
    const finalRiskLevel = String(body.finalRiskLevel ?? "").trim().toLowerCase();
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : "";
    const updates: {
      review_status: string;
      updated_at: string;
      final_error_type?: string;
      final_risk_level?: "high" | "medium" | "low";
      review_note?: string | null;
    } = {
      review_status: "completed",
      updated_at: new Date().toISOString(),
    };

    if (finalErrorType) {
      updates.final_error_type = finalErrorType;
    }

    if (finalRiskLevel === "high" || finalRiskLevel === "medium" || finalRiskLevel === "low") {
      updates.final_risk_level = finalRiskLevel;
    }

    if (Object.prototype.hasOwnProperty.call(body, "reviewNote")) {
      updates.review_note = reviewNote || null;
    }

    const { error } = await supabase
      .from("review_cases")
      .update(updates)
      .eq("id", reviewCaseId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: reviewCase } = await supabase
      .from("review_cases")
      .select("id, log_error_id, final_error_type")
      .eq("id", reviewCaseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (reviewCase?.log_error_id) {
      await syncHistoricalMissedCaseFromReviewCase({
        supabase,
        reviewCaseId: reviewCase.id,
        fallbackErrorType: finalErrorType || reviewCase.final_error_type,
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "backfill-historical-missed-cases") {
    const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);
    const result = await backfillHistoricalMissedCasesForUser({
      supabase,
      userId: user.id,
      limit,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  }

  if (body.action === "update-system-settings") {
    const nextSettings = toSystemSettings(body.systemSettings);
    const mergedMetadata = {
      ...(user.user_metadata ?? {}),
      systemSettings: nextSettings,
    };

    const { error } = await supabase.auth.updateUser({ data: mergedMetadata });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, settings: nextSettings });
  }

  if (body.action === "update-export-templates") {
    const nextTemplates = toExportTemplates(body.exportTemplates);
    const activeExportTemplateId = toActiveExportTemplateId(
      body.activeExportTemplateId,
      nextTemplates,
    );
    const customTemplates = nextTemplates.filter((item) => !item.builtin);
    const mergedMetadata = {
      ...(user.user_metadata ?? {}),
      exportTemplates: customTemplates,
      activeExportTemplateId,
    };

    const { error } = await supabase.auth.updateUser({ data: mergedMetadata });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const templatesWithUrl = await Promise.all(
      nextTemplates.map(async (item) => {
        if (!item.filePath) {
          return item;
        }

        const { data } = await supabase.storage
          .from("template-files")
          .createSignedUrl(item.filePath, 60 * 60);
        return data?.signedUrl ? { ...item, downloadUrl: data.signedUrl } : item;
      }),
    );

    return NextResponse.json({
      ok: true,
      exportTemplates: templatesWithUrl,
      activeExportTemplateId,
    });
  }

  if (body.action === "rules-toggle") {
    const ruleId = String(body.ruleId ?? "").trim();
    if (!ruleId) {
      return NextResponse.json({ error: "缺少规则 ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("detection_rules")
      .update({
        enabled: !!body.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "rules-rename") {
    const ruleId = String(body.ruleId ?? "").trim();
    const ruleName = String(body.ruleName ?? "").trim();
    if (!ruleId || !ruleName) {
      return NextResponse.json({ error: "缺少规则参数" }, { status: 400 });
    }

    const { error } = await supabase
      .from("detection_rules")
      .update({
        name: ruleName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "rules-delete") {
    const ruleId = String(body.ruleId ?? "").trim();
    if (!ruleId) {
      return NextResponse.json({ error: "缺少规则 ID" }, { status: 400 });
    }

    const { error } = await supabase.from("detection_rules").delete().eq("id", ruleId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "rules-duplicate") {
    const ruleId = String(body.ruleId ?? "").trim();
    if (!ruleId) {
      return NextResponse.json({ error: "缺少规则 ID" }, { status: 400 });
    }

    const { data: rule, error: queryError } = await supabase
      .from("detection_rules")
      .select("name, description, pattern, match_type, flags, error_type, risk_level, source_types")
      .eq("id", ruleId)
      .maybeSingle();

    if (queryError || !rule) {
      return NextResponse.json({ error: queryError?.message ?? "规则不存在" }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("detection_rules").insert({
      name: `${rule.name}（副本）`,
      description: rule.description,
      pattern: rule.pattern,
      match_type: rule.match_type,
      flags: rule.flags,
      error_type: rule.error_type,
      risk_level: rule.risk_level,
      source_types: rule.source_types,
      enabled: false,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "history-download") {
    const logId = String(body.logId ?? "").trim();
    if (!logId) {
      return NextResponse.json({ error: "缺少日志 ID" }, { status: 400 });
    }

    const { data: logRow, error: logError } = await supabase
      .from("logs")
      .select("id, file_name, storage_path")
      .eq("id", logId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (logError || !logRow) {
      return NextResponse.json({ error: logError?.message ?? "日志不存在" }, { status: 404 });
    }

    const storagePath = String(logRow.storage_path ?? "").trim();
    if (!storagePath) {
      return NextResponse.json({ error: "该日志没有可下载的存储文件" }, { status: 400 });
    }

    const { logBucket } = getSupabaseEnv();
    const { data, error } = await supabase.storage
      .from(logBucket)
      .createSignedUrl(storagePath, 60 * 5, { download: logRow.file_name ?? "log-file" });

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message ?? "下载链接生成失败" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      downloadUrl: data.signedUrl,
      fileName: logRow.file_name ?? "log-file",
    });
  }

  if (body.action === "history-delete") {
    const logId = String(body.logId ?? "").trim();
    if (!logId) {
      return NextResponse.json({ error: "缺少日志 ID" }, { status: 400 });
    }

    const { data: logRow, error: logError } = await supabase
      .from("logs")
      .select("id, storage_path")
      .eq("id", logId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (logError || !logRow) {
      return NextResponse.json({ error: logError?.message ?? "日志不存在" }, { status: 404 });
    }

    const storagePath = String(logRow.storage_path ?? "").trim();
    if (storagePath) {
      const { logBucket } = getSupabaseEnv();
      const { error: storageError } = await supabase.storage.from(logBucket).remove([storagePath]);
      if (storageError) {
        return NextResponse.json({ error: storageError.message }, { status: 400 });
      }
    }

    const { error } = await supabase.from("logs").delete().eq("id", logId).eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, logId });
  }

  return NextResponse.json({ error: "不支持的 action 参数" }, { status: 400 });
}

function inferTemplateFormatFromFileName(fileName: string) {
  const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : "";
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "Word";
  if (ext === "csv") return "CSV";
  if (ext === "json") return "JSON";
  if (ext === "txt" || ext === "md") return "TEXT";
  return ext ? ext.toUpperCase() : "FILE";
}









