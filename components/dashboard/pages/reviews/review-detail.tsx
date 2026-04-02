import { toIssueTypeDisplayName } from "@/lib/labels/issue-type";
import { ReviewHistoryCases } from "@/components/dashboard/pages/reviews/review-history-cases";
import type { ReviewItem } from "@/lib/dashboard/reviews";

type ReviewDetailProps = {
  item: ReviewItem | null;
  historyCases: ReviewItem[];
  queueLength: number;
  activeIndex: number;
  onSelectHistoryCase: (id: string) => void;
  onConfirmNext: () => void;
  isSubmitting: boolean;
  issueTypeValue: string;
  riskValue: string;
  reviewNote: string;
  onIssueTypeChange: (value: string) => void;
  onRiskChange: (value: string) => void;
  onReviewNoteChange: (value: string) => void;
};

const DEFAULT_ISSUE_TYPE_OPTIONS = [
  "确认：系统资源瓶颈",
  "确认：业务代码逻辑错误",
  "误报：常规维护操作",
  "其他原因",
];

const RISK_OPTIONS = [
  { value: "high", label: "高风险 (Critical)" },
  { value: "medium", label: "中风险 (Moderate)" },
  { value: "low", label: "低风险 (Low)" },
];

function riskBadgeClass(riskLabel: string) {
  if (riskLabel.includes("高")) return "bg-[#ff6e84] text-white";
  if (riskLabel.includes("低")) return "bg-emerald-500 text-white";
  return "bg-[#B07A47] text-white";
}

function confidencePercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function confidenceStroke(value: number) {
  const bounded = Math.max(0, Math.min(1, value));
  const circumference = 251.2;
  return circumference - circumference * bounded;
}

function buildIssueTypeOptions(currentValue: string) {
  return Array.from(new Set([currentValue, ...DEFAULT_ISSUE_TYPE_OPTIONS].filter(Boolean))).map((value) => ({
    value,
    label: value.startsWith("确认：") || value.startsWith("误报：") ? value : `确认：${toIssueTypeDisplayName(value)}`,
  }));
}

export function ReviewDetail({
  item,
  historyCases,
  queueLength,
  activeIndex,
  onSelectHistoryCase,
  onConfirmNext,
  isSubmitting,
  issueTypeValue,
  riskValue,
  reviewNote,
  onIssueTypeChange,
  onRiskChange,
  onReviewNoteChange,
}: ReviewDetailProps) {
  if (!item) {
    return (
      <div className="flex flex-1 flex-col bg-[#FCF8F1]">
        <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center p-8 text-[#6B625B]">
          当前没有待复核问题
        </div>
      </div>
    );
  }

  const isPendingItem = item.reviewStatus === "pending";
  const issueTypeOptions = buildIssueTypeOptions(issueTypeValue || item.issueTypeValue);

  return (
    <div className="flex flex-1 flex-col bg-[#FCF8F1]">
      <div className="mx-auto w-full max-w-5xl space-y-8 p-8 pb-40 md:pb-32">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-[0_0_15px_rgba(255,110,132,0.2)] ${riskBadgeClass(item.riskLabel)}`}>
              {item.riskLabel}
            </span>
            <span className="font-label text-xs uppercase tracking-widest text-[#8A8178]">Event ID: {item.incidentId}</span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold leading-tight tracking-tight text-[#352E2A]">{item.title}</h1>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-[#6B625B]">原始日志片段</h3>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#D8C7AE] bg-[#1F1A17] p-6 font-mono text-sm leading-relaxed text-white/80 shadow-[0_10px_24px_rgba(31,26,23,0.22)]">
            <div className="flex gap-4">
              <span className="select-none text-white/20">102</span>
              <pre className="m-0 whitespace-pre-wrap break-words text-white/80">{item.snippet || "暂无日志片段"}</pre>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-[#E2D5C2] bg-[#F7F2E8] p-6 shadow-[0_8px_20px_rgba(53,46,42,0.05)] md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8A5A2B]">psychology</span>
              <h3 className="text-sm font-bold text-[#352E2A]">AI 分析结论 (Insight)</h3>
            </div>
            <div>
              <p className="mb-1 font-label text-xs uppercase tracking-tighter text-[#8A8178]">根因定位</p>
              <p className="text-sm leading-relaxed text-[#4A4038]">{item.cause}</p>
            </div>
            <div>
              <p className="mb-1 font-label text-xs uppercase tracking-tighter text-[#8A8178]">建议策略</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#4A4038]">
                <li>{item.suggestion}</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 rounded-2xl border border-[#E2D5C2] bg-[#F7F2E8] p-6 text-center shadow-[0_8px_20px_rgba(53,46,42,0.05)]">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="h-full w-full -rotate-90">
                <circle className="text-[#E2D5C2]" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                <circle
                  className="text-[#8A5A2B]"
                  cx="48"
                  cy="48"
                  fill="transparent"
                  r="40"
                  stroke="currentColor"
                  strokeDasharray="251.2"
                  strokeDashoffset={confidenceStroke(item.confidence)}
                  strokeWidth="8"
                ></circle>
              </svg>
              <span className="absolute font-headline text-2xl font-bold text-[#352E2A]">{confidencePercent(item.confidence)}</span>
            </div>
            <p className="text-sm font-bold text-[#352E2A]">AI 置信度</p>
            <p className="text-[10px] text-[#8A8178]">{isPendingItem ? `当前待复核队列共 ${queueLength} 条问题` : "当前为历史复核案例"}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-[#E2D5C2] bg-[#F7F2E8] p-6 shadow-[0_8px_20px_rgba(53,46,42,0.05)]">
          <div className="mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8A5A2B]">edit_note</span>
            <div>
              <h3 className="text-lg font-bold text-[#352E2A]">人工复核确认表单</h3>
              <p className="mt-1 text-xs text-[#8A8178]">补充人工处理方法、知识沉淀要点或后续执行步骤。</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-wider text-[#6B625B]">人工判定原因</label>
              <select
                value={issueTypeValue}
                onChange={(event) => onIssueTypeChange(event.target.value)}
                disabled={!isPendingItem}
                className="w-full rounded-xl border border-[#D8C7AE] bg-[#EEDFC2] px-4 py-3 text-sm text-[#352E2A] outline-none transition focus:border-[#8A5A2B]/45 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {issueTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-wider text-[#6B625B]">风险确认级别</label>
              <select
                value={riskValue}
                onChange={(event) => onRiskChange(event.target.value)}
                disabled={!isPendingItem}
                className="w-full rounded-xl border border-[#D8C7AE] bg-[#EEDFC2] px-4 py-3 text-sm text-[#352E2A] outline-none transition focus:border-[#8A5A2B]/45 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {RISK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-label uppercase tracking-wider text-[#6B625B]">复核说明 / 处置方案</label>
            <textarea
              value={reviewNote}
              onChange={(event) => onReviewNoteChange(event.target.value)}
              disabled={!isPendingItem}
              rows={4}
              placeholder="请输入详细的人工复核意见或待执行的紧急处置步骤..."
              className="w-full rounded-2xl border border-[#D8C7AE] bg-[#EEDFC2] p-4 text-sm leading-7 text-[#352E2A] outline-none transition placeholder:text-[#F9F3E8] focus:border-[#8A5A2B]/45 disabled:cursor-not-allowed disabled:opacity-70"
            />
            {!isPendingItem ? (
              <p className="mt-3 text-xs text-[#8A8178]">历史案例当前仅供查看，不再编辑复核说明。</p>
            ) : null}
          </div>
        </div>

        <ReviewHistoryCases rows={historyCases} onSelect={onSelectHistoryCase} />
      </div>

      <footer className="glass-panel fixed bottom-0 left-0 right-0 z-40 flex min-h-20 flex-col gap-4 border-t border-[#D8C7AE] bg-[#F7F2E8]/92 px-4 py-4 backdrop-blur-xl md:left-64 md:h-20 md:flex-row md:items-center md:justify-between md:px-8 md:py-0">
        <div className="flex flex-wrap items-center gap-4">
          <button className="rounded-xl px-6 py-2.5 text-sm font-medium text-[#6B625B] transition-all hover:bg-[#EFE4D2] hover:text-[#352E2A]" type="button">
            驳回系统结论
          </button>
          <div className="mx-2 hidden h-6 w-px bg-[#D8C7AE] md:block"></div>
          <button className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-[#6B625B] transition-all hover:bg-[#EFE4D2] hover:text-[#352E2A]" type="button">
            <span className="material-symbols-outlined text-sm">auto_stories</span>
            加入知识库
          </button>
          <button className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-[#6B625B] transition-all hover:bg-[#EFE4D2] hover:text-[#352E2A]" type="button">
            <span className="material-symbols-outlined text-sm">terminal</span>
            生成规则候选
          </button>
          <span className="ml-0 text-xs text-[#8A8178] md:ml-3">
            {isPendingItem ? `当前处理 ${queueLength > 0 ? activeIndex + 1 : 0} / ${queueLength}` : "历史案例详情"}
          </span>
        </div>
        {isPendingItem ? (
          <button
            className="rounded-xl bg-[#8A5A2B] px-10 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(168,115,58,0.3)] transition-all hover:shadow-[0_0_40px_rgba(168,115,58,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={onConfirmNext}
            disabled={queueLength === 0 || isSubmitting}
          >
            {isSubmitting ? "确认中..." : "确认并下一条"}
          </button>
        ) : (
          <div className="rounded-xl border border-[#D8C7AE] bg-[#FBF6ED] px-5 py-3 text-sm text-[#6B625B]">
            历史案例仅供查看
          </div>
        )}
      </footer>
    </div>
  );
}
