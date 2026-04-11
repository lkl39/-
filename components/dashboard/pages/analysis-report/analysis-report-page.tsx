"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisReportData } from "@/lib/dashboard/analysis-report";

type AnalysisReportPageProps = {
  data: AnalysisReportData;
};

export function AnalysisReportPage({ data }: AnalysisReportPageProps) {
  const router = useRouter();
  const pdfExportRef = useRef<HTMLDivElement | null>(null);
  const isProcessing = data.log.status === "processing";
  const [exportingPdf, setExportingPdf] = useState(false);
  const confidencePercent = Math.round((data.summary.avgConfidence || 0) * 100);
  const totalRisk = Math.max(1, data.riskDistribution.high + data.riskDistribution.medium + data.riskDistribution.low);

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const timerId = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isProcessing, router]);

  const riskItems = useMemo(
    () => [
      { label: "高风险", count: data.riskDistribution.high, color: "#E05B4C" },
      { label: "中风险", count: data.riskDistribution.medium, color: "#D8A94A" },
      { label: "低风险", count: data.riskDistribution.low, color: "#6BAE7A" },
    ],
    [data.riskDistribution.high, data.riskDistribution.low, data.riskDistribution.medium],
  );

  const riskGradient = useMemo(() => {
    let current = 0;
    const segments = riskItems.map((item) => {
      const percent = totalRisk > 0 ? (item.count / totalRisk) * 100 : 0;
      const start = current;
      const end = current + percent;
      current = end;
      return `${item.color} ${start}% ${end}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [riskItems, totalRisk]);

  function exportWord() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>分析报告</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;padding:24px;color:#222}h1,h2{margin:0 0 12px}h2{margin-top:24px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f7f7f7}</style></head><body><h1>日志分析报告</h1><p>报告ID：${data.summary.reportId}</p><p>日志文件：${data.log.fileName}</p><p>分析时间：${formatDateTime(data.log.createdAt)}</p><h2>摘要</h2><ul><li>问题总数：${data.summary.totalIssues}</li><li>高风险问题：${data.summary.highRiskCount}</li><li>主要异常类型：${data.summary.topType}</li><li>建议复核：${data.summary.needsReview ? "是" : "否"}</li></ul><h2>问题明细</h2><table><thead><tr><th>事件ID</th><th>类型</th><th>风险</th><th>置信度</th><th>建议</th></tr></thead><tbody>${data.detailRows.map((item) => `<tr><td>${item.incidentId}</td><td>${item.type}</td><td>${item.riskLabel}</td><td>${Math.round(item.confidence * 100)}%</td><td>${item.suggestion}</td></tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(data.log.fileName)}-分析报告.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (exportingPdf) {
      return;
    }

    const exportNode = pdfExportRef.current;
    if (!exportNode) {
      window.alert("PDF 导出模板尚未准备完成，请稍后重试。");
      return;
    }

    setExportingPdf(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      if (!html2canvas || !jsPDF) {
        window.alert("PDF 导出依赖不可用，请稍后重试。");
        return;
      }

      const canvas = await html2canvas(exportNode, {
        backgroundColor: "#ffffff",
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imageHeight = (canvas.height * printableWidth) / canvas.width;

      let remainingHeight = imageHeight;

      pdf.addImage(imageData, "PNG", margin, margin, printableWidth, imageHeight, undefined, "FAST");
      remainingHeight -= printableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        const offsetY = margin - (imageHeight - remainingHeight);
        pdf.addImage(imageData, "PNG", margin, offsetY, printableWidth, imageHeight, undefined, "FAST");
        remainingHeight -= printableHeight;
      }

      pdf.save(`${sanitizeFileName(data.log.fileName)}-分析报告.pdf`);
    } catch {
      window.alert("PDF 导出失败，请稍后重试。");
    } finally {
      setExportingPdf(false);
    }
  }

  function submitReview() {
    router.push(`/dashboard/reviews?logId=${encodeURIComponent(data.log.id)}&from=analysis-report`);
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      {isProcessing ? (
        <section className="mb-6 rounded-2xl border border-[#E8D3A1] bg-[#FFF5DE] px-4 py-3 text-sm text-[#8A6A24]">
          当前日志仍在分析中，页面将每 3 秒自动刷新一次，完成后会自动显示最新报告内容。
        </section>
      ) : null}

      <header className="mb-10 flex flex-col gap-6 pt-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 font-label text-sm uppercase tracking-widest text-[#8A8178]">
            <span>{`报告 ID: ${data.summary.reportId}`}</span>
            <span className="h-1 w-1 rounded-full bg-[#D8C7AE]" />
            <span>{formatDateTime(data.log.createdAt)}</span>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-[#352E2A]">{data.log.fileName}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#BFDDC9] bg-[#E8F4EC] px-3 py-1 text-xs font-label text-[#2F6A42]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B925F]" />
                {data.log.statusLabel}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-label ${data.summary.needsReview ? "border border-[#E8D3A1] bg-[#FFF5DE] text-[#8A6A24]" : "border border-[#D8C7AE] bg-[#EFE4D2] text-[#6B625B]"}`}>
                <span className="material-symbols-outlined text-xs">priority_high</span>
                {data.summary.needsReview ? "建议复核" : "复核可选"}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#6B625B]">{`分析平均置信度: ${confidencePercent}% · 日志大小: ${data.log.fileSizeLabel}`}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={exportWord} className="glass-card inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#352E2A] transition-colors hover:bg-[#EFE4D2]">
            <span className="material-symbols-outlined text-sm">description</span>
            导出 Word
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={exportingPdf}
            className="glass-card inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#352E2A] transition-colors hover:bg-[#EFE4D2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            {exportingPdf ? "导出中..." : "导出 PDF"}
          </button>
          <button type="button" onClick={submitReview} className="inline-flex items-center gap-2 rounded-lg border border-[#8A5A2B]/30 bg-[#8A5A2B]/12 px-4 py-2 text-sm font-bold text-[#8A5A2B] transition-all hover:bg-[#8A5A2B]/20">
            <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
            提交复核
          </button>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="问题总数" value={String(data.summary.totalIssues)} hint="已识别异常样本" accent="default" />
        <SummaryCard label="高风险问题数" value={String(data.summary.highRiskCount)} hint="需优先处理" accent="warning" />
        <SummaryCard label="主要异常类型" value={data.summary.topType} hint={`出现次数 ${data.summary.topTypeCount}`} accent="soft" />
        <SummaryCard label="建议优先处理项" value={truncateText(data.summary.topSuggestion, 26)} hint={`平均置信度 ${confidencePercent}%`} accent="primary" />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="glass-card rounded-2xl p-8 xl:col-span-7">
          <h2 className="mb-8 flex items-center gap-2 text-lg font-bold text-[#352E2A]">
            <span className="material-symbols-outlined text-[#8A5A2B]">bar_chart</span>
            问题类型分布
          </h2>
          <div className="space-y-6">
            {data.problemTypes.length > 0 ? (
              data.problemTypes.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-xs font-label uppercase tracking-wider text-[#8A8178]">
                    <span>{item.name}</span>
                    <span>{`${item.count} (${item.percent}%)`}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6D9C7]">
                    <div className="h-full rounded-full bg-[#8A5A2B]" style={{ width: `${Math.max(item.percent, 4)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D8C7AE] bg-[#FBF6ED] px-6 py-10 text-center text-sm text-[#8A8178]">暂无问题类型分布数据</div>
            )}
          </div>
        </div>

        <div className="glass-card flex flex-col rounded-2xl p-8 xl:col-span-5">
          <h2 className="mb-8 flex items-center gap-2 text-lg font-bold text-[#352E2A]">
            <span className="material-symbols-outlined text-[#8A5A2B]">donut_large</span>
            风险等级分布
          </h2>
          <div className="flex flex-1 flex-col justify-center gap-6 md:flex-row md:items-center">
            <div
              className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
              style={{ background: riskGradient }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#FCF8F1] shadow-[0_8px_20px_rgba(53,46,42,0.08)]">
                <div className="font-headline text-3xl font-black text-[#352E2A]">{data.summary.totalIssues}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#8A8178]">总问题数</div>
              </div>
            </div>
            <div className="space-y-4">
              {riskItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm text-[#6B625B]">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{`${item.label} (${item.count})`}</span>
                  <span className="font-label text-xs uppercase tracking-[0.16em] text-[#8A8178]">{`${Math.round((item.count / totalRisk) * 100)}%`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10 glass-card rounded-2xl p-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#352E2A]">
              <span className="material-symbols-outlined text-[#8A5A2B]">network_intelligence</span>
              根因分析
            </h2>
            <div className="rounded-2xl border border-[#E2D5C2] bg-[#FBF6ED] p-6 text-base leading-8 text-[#4A4038]">
              {data.summary.topCause}
            </div>
          </div>
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#352E2A]">
              <span className="material-symbols-outlined text-[#8A5A2B]">lightbulb</span>
              优先建议
            </h2>
            <div className="space-y-3 rounded-2xl border border-[#E2D5C2] bg-[#FBF6ED] p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D8C7AE] bg-white/50 px-3 py-1 text-xs font-label uppercase tracking-widest text-[#6B625B]">
                <span className="material-symbols-outlined text-sm">bolt</span>
                {data.summary.needsReview ? "建议复核" : "系统建议"}
              </div>
              <p className="text-sm leading-7 text-[#4A4038]">{data.summary.topSuggestion}</p>
              <p className="text-xs text-[#8A8178]">当前主要异常类型为 {data.summary.topType}，系统建议优先确认高风险问题的处理动作。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#8A8178]">
          <span className="material-symbols-outlined text-sm">info</span>
          {`共匹配到 ${data.detailRows.length} 个问题样本`}
        </div>
        {data.detailRows.length > 0 ? (
          data.detailRows.map((item) => (
            <article key={item.id} className="glass-card overflow-hidden rounded-2xl border border-[#E2D5C2] p-6 shadow-[0_10px_24px_rgba(53,46,42,0.05)]">
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-[#352E2A]">{item.type}</h3>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${item.riskLabel === "高风险" ? "bg-[#FFE2E6] text-[#9B1B30]" : item.riskLabel === "中风险" ? "bg-[#FFF5DE] text-[#8A6A24]" : "bg-[#E8F4EC] text-[#2F6A42]"}`}>
                      {item.riskLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#EFE4D2] px-3 py-1 text-xs text-[#6B625B]">{`置信度 ${Math.round(item.confidence * 100)}%`}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#8A8178]">{`事件 ID ${item.incidentId} · 行号 ${item.lineNumber}`}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-[#FBF6ED] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A8178]">根因判断</p>
                  <p className="mt-2 text-sm leading-7 text-[#2F2926]">{item.cause}</p>
                </div>
                <div className="rounded-2xl bg-[#FBF6ED] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A17442]">处理建议</p>
                  <p className="mt-2 text-sm leading-7 text-[#2F2926]">{item.suggestion}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-[#241F1B] px-4 py-3 shadow-inner shadow-black/20">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F3E7D3]">日志片段</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-[#F8F3EA]">{item.snippet || "暂无日志片段"}</pre>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#D8C7AE] bg-[#FBF6ED] px-6 py-12 text-center text-sm text-[#8A8178]">暂无问题详情数据</div>
        )}
      </section>

      <div className="pointer-events-none fixed left-[-10000px] top-0">
        <PdfExportSheet
          ref={pdfExportRef}
          data={data}
          confidencePercent={confidencePercent}
          totalRisk={totalRisk}
          riskItems={riskItems}
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: "default" | "warning" | "soft" | "primary" }) {
  const accentClass =
    accent === "warning"
      ? "border-l-4 border-[#E68A17]"
      : accent === "primary"
        ? "border border-[#8A5A2B]/20"
        : "";
  const valueClass = accent === "warning" ? "text-[#E68A17]" : accent === "primary" ? "text-[#8A5A2B]" : "text-[#352E2A]";

  return (
    <div className={`glass-card relative overflow-hidden rounded-2xl p-6 ${accentClass}`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#8A5A2B]/10 blur-3xl" />
      <p className="mb-2 font-label text-xs uppercase tracking-widest text-[#8A8178]">{label}</p>
      <h3 className={`font-headline text-4xl font-black ${valueClass}`}>{value}</h3>
      <div className="mt-4 text-xs text-[#8A8178]">{hint}</div>
    </div>
  );
}

type PdfExportSheetProps = {
  data: AnalysisReportData;
  confidencePercent: number;
  totalRisk: number;
  riskItems: Array<{ label: string; count: number; color: string }>;
};

const PdfExportSheet = forwardRef<HTMLDivElement, PdfExportSheetProps>(function PdfExportSheet(
  { data, confidencePercent, totalRisk, riskItems },
  ref,
) {
  return (
    <div ref={ref} className="w-[794px] bg-white px-10 py-8 text-[#222222]">
      <header className="border-b border-[#E5E7EB] pb-5">
        <h1 className="text-3xl font-bold">日志分析报告</h1>
        <div className="mt-3 space-y-1 text-sm text-[#4B5563]">
          <p>{`报告 ID：${data.summary.reportId}`}</p>
          <p>{`日志文件：${data.log.fileName}`}</p>
          <p>{`分析时间：${formatDateTime(data.log.createdAt)}`}</p>
          <p>{`平均置信度：${confidencePercent}%`}</p>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-bold">报告摘要</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <PdfMetric label="问题总数" value={String(data.summary.totalIssues)} />
          <PdfMetric label="高风险问题" value={String(data.summary.highRiskCount)} />
          <PdfMetric label="主要异常类型" value={data.summary.topType} />
          <PdfMetric label="建议复核" value={data.summary.needsReview ? "是" : "否"} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">风险等级分布</h2>
        <div className="mt-3 space-y-2 text-sm">
          {riskItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-md bg-[#F9FAFB] px-3 py-2">
              <span>{item.label}</span>
              <span className="font-medium">{`${item.count} (${Math.round((item.count / totalRisk) * 100)}%)`}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">问题类型分布</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-[#E5E7EB]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="border-b border-[#E5E7EB] px-3 py-2">类型</th>
                <th className="border-b border-[#E5E7EB] px-3 py-2">数量</th>
                <th className="border-b border-[#E5E7EB] px-3 py-2">占比</th>
              </tr>
            </thead>
            <tbody>
              {data.problemTypes.length > 0 ? (
                data.problemTypes.map((item) => (
                  <tr key={item.name}>
                    <td className="border-b border-[#E5E7EB] px-3 py-2">{item.name}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-2">{item.count}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-2">{`${item.percent}%`}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-[#6B7280]">暂无问题类型分布数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">根因分析</h2>
        <div className="mt-3 rounded-lg bg-[#F9FAFB] px-4 py-3 text-sm leading-7">
          {data.summary.topCause}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">优先建议</h2>
        <div className="mt-3 rounded-lg bg-[#F9FAFB] px-4 py-3 text-sm leading-7">
          {data.summary.topSuggestion}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">问题明细</h2>
        <div className="mt-3 space-y-4">
          {data.detailRows.length > 0 ? (
            data.detailRows.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-lg border border-[#E5E7EB]">
                <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-base font-semibold">{item.type}</h3>
                    <span className="text-xs font-medium">{`${item.riskLabel} · ${Math.round(item.confidence * 100)}%`}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#6B7280]">{`事件 ID ${item.incidentId} · 行号 ${item.lineNumber}`}</p>
                </div>
                <div className="space-y-3 px-4 py-3 text-sm">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">根因判断</p>
                    <p className="mt-1 leading-7">{item.cause}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">处理建议</p>
                    <p className="mt-1 leading-7">{item.suggestion}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">日志片段</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-[#111827] px-3 py-3 text-xs leading-6 text-[#F9FAFB]">{item.snippet || "暂无日志片段"}</pre>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-[#D1D5DB] px-4 py-4 text-sm text-[#6B7280]">
              暂无问题详情数据
            </div>
          )}
        </div>
      </section>
    </div>
  );
});

function PdfMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function sanitizeFileName(value: string) {
  return String(value || "analysis-report").replace(/[\\/:*?"<>|]/g, "-");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
