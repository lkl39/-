import type { ReviewItem } from "@/lib/dashboard/reviews";

type ReviewQueueProps = {
  queue: ReviewItem[];
  activeId: string | null;
  activeIndex: number;
  onSelect: (id: string) => void;
};

function toRiskChip(item: ReviewItem) {
  if (item.riskLabel.includes("高")) {
    return {
      text: "HIGH RISK",
      className: "bg-[#ff6e84]/20 text-[#ff6e84] border border-[#ff6e84]/30",
    };
  }

  if (item.riskLabel.includes("低")) {
    return {
      text: "LOW RISK",
      className: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30",
    };
  }

  return {
    text: "PENDING",
    className: "bg-[#ffb2b9]/10 text-orange-500 border border-orange-400/30",
  };
}

function toSourceIcon(title: string) {
  const key = title.toLowerCase();
  if (key.includes("数据库") || key.includes("sql") || key.includes("db")) return "database";
  if (key.includes("api") || key.includes("http") || key.includes("网络")) return "lan";
  if (key.includes("内存") || key.includes("memory")) return "memory";
  return "description";
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ReviewQueue({ queue, activeId, activeIndex, onSelect }: ReviewQueueProps) {
  return (
    <div className="flex w-full flex-col overflow-y-auto border-r border-[#E2D5C2] bg-[#F3EBDD] lg:w-[34%]">
      <div className="sticky top-0 z-10 flex items-end justify-between border-b border-[#E2D5C2] bg-[#F3EBDD]/95 p-6 backdrop-blur-sm">
        <div>
          <h2 className="font-headline text-lg font-bold tracking-tight text-[#352E2A]">待复核列表</h2>
          <p className="mt-1 font-label text-xs text-[#6B625B]">
            {queue.length > 0 ? `当前连续处理 ${activeIndex + 1} / ${queue.length}` : "当前处理 0 / 0"}
          </p>
        </div>
        <button className="material-symbols-outlined text-[#8A8178] transition-colors hover:text-[#352E2A]" type="button">
          filter_list
        </button>
      </div>
      <div className="space-y-3 px-4 pb-12">
        {queue.length === 0 ? (
          <div className="rounded-2xl border border-[#E2D5C2] bg-[#FBF6ED] p-5 text-sm text-[#6B625B]">
            当前没有待复核任务
          </div>
        ) : (
          queue.map((item) => {
            const active = item.id === activeId;
            const riskChip = toRiskChip(item);
            const updatedAt = new Date(item.updatedAt).toLocaleTimeString("zh-CN", { hour12: false });

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                  active
                    ? "border-[#A8733A]/30 bg-[#F7F2E8] shadow-[0_0_15px_rgba(168,115,58,0.1)]"
                    : "border-[#E2D5C2] bg-[#FBF6ED] shadow-[0_4px_12px_rgba(53,46,42,0.03)] hover:bg-[#F7F0E4]"
                }`}
              >
                {active ? <div className="absolute left-0 top-0 h-full w-1 bg-[#A8733A]"></div> : null}
                <div className="mb-3 flex items-start justify-between">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${riskChip.className}`}>{riskChip.text}</span>
                  <span className="font-label text-[10px] uppercase tracking-tighter text-[#8A8178]">{updatedAt}</span>
                </div>
                <h3 className="mb-2 text-sm font-bold text-[#352E2A] transition-colors group-hover:text-[#8A5A2B]">{item.title}</h3>
                <div className="mb-4 flex items-center gap-2 text-xs text-[#6B625B]">
                  <span className="material-symbols-outlined text-xs">{toSourceIcon(item.title)}</span>
                  <span>{item.sourceLog}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6B625B]">AI 置信度: {formatConfidence(item.confidence)}</span>
                  <span className={active ? "flex items-center gap-1 font-bold text-[#8A5A2B]" : "text-[#8A8178]"}>
                    {active ? "处理中" : "等待复核"}
                    {active ? <span className="h-1 w-1 rounded-full bg-[#8A5A2B]"></span> : null}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
