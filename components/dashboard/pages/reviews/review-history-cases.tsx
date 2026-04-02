import type { ReviewItem } from "@/lib/dashboard/reviews";

type ReviewHistoryCasesProps = {
  rows: ReviewItem[];
  onSelect: (id: string) => void;
};

function formatMeta(item: ReviewItem) {
  const parts = [new Date(item.updatedAt).toLocaleDateString("zh-CN"), `来源：${item.sourceLog}`, item.riskLabel];
  return parts.join(" · ");
}

export function ReviewHistoryCases({ rows, onSelect }: ReviewHistoryCasesProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-label text-xs uppercase tracking-widest text-[#6B625B]">历史相似案例</h3>
      <div className="grid grid-cols-1 gap-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-[#E2D5C2] bg-[#FBF6ED] p-4 text-sm text-[#6B625B]">暂无历史复核案例</div>
        ) : (
          rows.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-[#E2D5C2] bg-[#FBF6ED] p-4 transition-colors hover:border-[#D4C1A6]"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-emerald-500/80">check_circle</span>
                <div>
                  <p className="text-sm font-medium text-[#352E2A]">{item.title}</p>
                  <p className="text-[10px] text-[#8A8178]">{formatMeta(item)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="text-xs text-[#8A8178] transition-colors hover:text-[#352E2A]"
              >
                查看详情
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
