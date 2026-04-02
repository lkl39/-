import Link from "next/link";
import type { AnalysisRow } from "@/lib/dashboard/analyses";

type AnalysesTableProps = {
  rows: AnalysisRow[];
};

function riskClass(riskLabel: string) {
  if (riskLabel === "高风险") return "risk-high";
  if (riskLabel === "中风险") return "risk-medium";
  if (riskLabel === "低风险") return "risk-low";
  return "bg-[#EFE4D2] text-[#8A8178] border border-[#D8C7AE]";
}

function statusClass(statusLabel: string) {
  if (statusLabel === "已完成") return "status-completed";
  if (statusLabel === "分析中") return "status-progress";
  return "status-failed";
}

export function AnalysesTable({ rows }: AnalysesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#FBF6ED]">
            <th className="border-b border-[#E2D5C2] px-6 py-4 font-label text-[10px] uppercase tracking-[0.28em] text-[#7A6E63]">日志名称</th>
            <th className="border-b border-[#E2D5C2] px-6 py-4 font-label text-[10px] uppercase tracking-[0.28em] text-[#7A6E63]">上传时间</th>
            <th className="border-b border-[#E2D5C2] px-6 py-4 font-label text-[10px] uppercase tracking-[0.28em] text-[#7A6E63]">分析状态</th>
            <th className="border-b border-[#E2D5C2] px-6 py-4 text-center font-label text-[10px] uppercase tracking-[0.28em] text-[#7A6E63]">问题数量</th>
            <th className="border-b border-[#E2D5C2] px-6 py-4 font-label text-[10px] uppercase tracking-[0.28em] text-[#7A6E63]">风险等级</th>
            <th className="border-b border-[#E2D5C2] px-6 py-4 text-right font-label text-[10px] uppercase tracking-[0.28em] text-[#7A6E63]">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2D5C2]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-16">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <span className="material-symbols-outlined text-3xl text-[#B8ADA0]">history</span>
                  <p className="text-sm font-medium text-[#6B625B]">当前筛选条件下没有匹配的分析记录</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const canView = row.statusLabel === "已完成";
              return (
                <tr key={row.id} className="group transition-colors duration-150 hover:bg-[#FBF4E8]">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#8A5A2B]/70">description</span>
                      <span className="text-sm font-medium text-[#352E2A]">{row.fileName || "未命名日志"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-[#6B625B]">{new Date(row.createdAt).toLocaleString("zh-CN")}</td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-2 text-xs font-semibold ${statusClass(row.statusLabel)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>
                      {row.statusLabel}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="font-label text-sm text-[#352E2A]">{row.issueCount}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${riskClass(row.riskLabel)}`}>
                      {row.riskLabel}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {canView ? (
                      <Link
                        href={`/dashboard/analyses?logId=${encodeURIComponent(row.id)}`}
                        className="text-xs font-bold text-[#8A5A2B] transition-all hover:text-[#6B4422] hover:underline"
                      >
                        查看详情
                      </Link>
                    ) : (
                      <button className="cursor-not-allowed text-xs font-bold text-[#B8ADA0]" type="button">
                        查看详情
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
