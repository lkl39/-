import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";

type LogDetailProps = {
  log: {
    id: string;
    fileName: string;
    fileType: string;
    sourceType: string;
    analysisMode: string;
    status: string;
    storagePath: string;
    fileSize: number;
    lineCount: number;
    uploadedAt: string;
    completedAt: string | null;
  };
  errors: {
    id: string;
    rawText: string;
    errorType: string;
    detectedBy: string;
    lineNumber: number;
    createdAt: string;
  }[];
  analyses: {
    id: string;
    logErrorId: string | null;
    cause: string;
    riskLevel: string;
    confidence: number;
    repairSuggestion: string;
    modelName: string;
    analysisMode: string;
    createdAt: string;
  }[];
  preview: {
    text: string;
    truncated: boolean;
  } | null;
};

export function LogDetail({
  log,
  errors,
  analyses,
  preview,
}: LogDetailProps) {
  const analysisByErrorId = new Map(
    analyses
      .filter((analysis) => analysis.logErrorId)
      .map((analysis) => [analysis.logErrorId as string, analysis]),
  );

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Task"
          title={log.fileName}
          description="这里展示单次日志任务的完整上下文。后续模型分析、人工复核和知识沉淀都会继续挂在这条链路上。"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock label="任务状态" value={log.status}>
              <StatusPill label={log.status} tone={getStatusTone(log.status)} />
            </InfoBlock>
            <InfoBlock label="分析模式" value={log.analysisMode}>
              <StatusPill label={log.analysisMode} tone="info" />
            </InfoBlock>
            <InfoBlock label="日志来源" value={log.sourceType} />
            <InfoBlock label="文件类型" value={log.fileType || "unknown"} />
            <InfoBlock label="文件大小" value={formatBytes(log.fileSize)} />
            <InfoBlock label="总行数" value={`${log.lineCount} lines`} />
            <InfoBlock label="上传时间" value={formatTimestamp(log.uploadedAt)} />
            <InfoBlock
              label="完成时间"
              value={log.completedAt ? formatTimestamp(log.completedAt) : "Not completed"}
            />
          </div>

          <div className="mt-5 rounded-3xl border border-white/8 bg-slate-950/35 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              storage path
            </p>
            <p className="mt-2 break-all font-mono text-sm text-cyan-200">
              {log.storagePath || "No storage path"}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Summary"
          title="任务摘要"
          description="把这个任务的异常数、分析数和高风险数量单独拉出来，避免在大表里来回找。"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="异常命中" value={`${errors.length}`} />
            <SummaryCard label="分析结果" value={`${analyses.length}`} />
            <SummaryCard
              label="高风险"
              value={`${analyses.filter((item) => item.riskLevel === "high").length}`}
            />
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/8 p-4">
            <p className="text-sm font-semibold text-white">页面导航</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                返回总览
              </Link>
              <Link
                href="/dashboard/rules"
                className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
              >
                打开规则中心
              </Link>
              <Link
                href={`/dashboard/reviews?logId=${encodeURIComponent(log.id)}`}
                className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
              >
                打开人工复核
              </Link>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          eyebrow="Incidents"
          title="异常命中明细"
          description="这里按行号展示命中的异常片段，并串起对应的结构化分析结果。"
        >
          <div className="space-y-3">
            {errors.length === 0 ? (
              <EmptyState text="当前任务没有规则命中的异常记录。" />
            ) : (
              errors.map((error) => {
                const analysis = analysisByErrorId.get(error.id);

                return (
                  <div
                    key={error.id}
                    className="rounded-3xl border border-white/8 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill label={error.errorType} tone="warning" />
                          <StatusPill label={error.detectedBy} tone="info" />
                          <span className="text-xs text-slate-500">
                            line {error.lineNumber || "-"}
                          </span>
                        </div>
                        <p className="font-mono text-sm leading-6 text-slate-200">
                          {error.rawText}
                        </p>
                        {analysis ? (
                          <div className="rounded-2xl bg-slate-950/40 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill
                                label={analysis.riskLevel}
                                tone={getRiskTone(analysis.riskLevel)}
                              />
                              <span className="text-xs text-slate-500">
                                confidence {formatConfidence(analysis.confidence)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-white">
                              {analysis.cause}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {analysis.repairSuggestion}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatTimestamp(error.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Preview"
          title="原始日志预览"
          description="这里只展示前 40 行内容，用来快速核对上下文。大文件不会整页硬展开。"
        >
          {preview ? (
            <div className="rounded-3xl border border-white/8 bg-slate-950/35 p-4">
              <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-300">
                {preview.text}
              </pre>
              {preview.truncated ? (
                <p className="mt-4 text-xs text-slate-500">
                  这里只展示前 40 行预览，完整原始文件仍保存在 Storage。
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyState text="当前任务没有可展示的原始日志预览，可能是文件过大或读取失败。" />
          )}
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Analysis"
        title="分析结果列表"
        description="这里按 analysis_results 展示该任务的全部结构化结论，后续大模型输出会直接落在同一块。"
      >
        <div className="space-y-3">
          {analyses.length === 0 ? (
            <EmptyState text="当前任务还没有 analysis_results。" />
          ) : (
            analyses.map((analysis) => (
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
                      <StatusPill label={analysis.modelName} tone="neutral" />
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
    </>
  );
}

function InfoBlock({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-4">
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
