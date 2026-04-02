"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { HistoryCaseRow, HistoryCasesPageData } from "@/lib/dashboard/history-cases";

type HistoryCasesPageProps = {
  data: HistoryCasesPageData;
};

const PAGE_SIZE = 12;

export function HistoryCasesPage({ data }: HistoryCasesPageProps) {
  const [riskFilter, setRiskFilter] = useState("全部级别");
  const [typeFilter, setTypeFilter] = useState("全部类型");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const typeOptions = useMemo(() => ["全部类型", ...Array.from(new Set(data.rows.map((item) => item.typeLabel)))], [data.rows]);

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return data.rows.filter((row) => {
      const riskMatch = riskFilter === "全部级别" || row.riskLabel === riskFilter;
      const typeMatch = typeFilter === "全部类型" || row.typeLabel === typeFilter;
      const statusMatch = statusFilter === "全部状态" || row.reviewStatusLabel === statusFilter;
      const keywordMatch =
        normalizedKeyword.length === 0 ||
        row.title.toLowerCase().includes(normalizedKeyword) ||
        row.sourceLog.toLowerCase().includes(normalizedKeyword) ||
        row.incidentId.toLowerCase().includes(normalizedKeyword) ||
        row.snippet.toLowerCase().includes(normalizedKeyword);
      return riskMatch && typeMatch && statusMatch && keywordMatch;
    });
  }, [data.rows, keyword, riskFilter, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filteredRows.length);

  return (
    <div className="mx-auto w-full max-w-7xl text-[#352E2A]">
      <header className="mb-10">
        <div>
          <h1 className="mb-2 font-headline text-4xl font-extrabold tracking-tight">历史问题库</h1>
          <p className="max-w-3xl text-sm leading-7 text-[#6B625B]">聚合已关闭问题的历史复盘记录，支持按归档状态、风险和根因路径检索，沉淀可复用经验。</p>
        </div>
      </header>

      <section className="glass-panel sticky top-20 z-20 mb-8 rounded-2xl border border-[#E2D5C2] p-4 shadow-[0_10px_24px_rgba(53,46,42,0.05)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-label text-[10px] uppercase tracking-widest text-[#8A8178]">历史与知识自由切换</p>
          <span className="text-[10px] text-[#B8ADA0]">在三个页面之间快速跳转</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/dashboard/tasks" className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]">历史日志存档</Link>
          <button type="button" className="rounded-xl border border-[#8A5A2B]/30 bg-gradient-to-r from-[#8A5A2B]/20 to-transparent px-4 py-3 text-sm font-bold text-[#8A5A2B]">历史问题库（当前）</button>
          <Link href="/dashboard/knowledge" className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]">探索根因知识库</Link>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <FilterSelect label="风险等级" value={riskFilter} options={["全部级别", "高风险", "中风险", "低风险"]} onChange={(value) => { setRiskFilter(value); setCurrentPage(1); }} />
        <FilterSelect label="问题类型" value={typeFilter} options={typeOptions} onChange={(value) => { setTypeFilter(value); setCurrentPage(1); }} />
        <FilterSelect label="归档状态" value={statusFilter} options={["全部状态", "已复盘", "已归档", "已跳过"]} onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }} />
        <div className="glass-panel rounded-xl border border-[#E2D5C2] p-4 lg:col-span-2">
          <label className="mb-3 block font-label text-[10px] uppercase tracking-widest text-[#8A8178]">关键词搜索</label>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8A5A2B]">manage_search</span>
            <input value={keyword} onChange={(event) => { setKeyword(event.target.value); setCurrentPage(1); }} placeholder="输入错误代码、日志摘要或事件 ID..." className="w-full border-none bg-transparent text-sm text-[#352E2A] outline-none placeholder:text-[#8C7F72]" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#E2D5C2] bg-[#F7F2E8] shadow-[0_14px_34px_rgba(53,46,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2D5C2] bg-[#FBF6ED]">
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-[#8A8178]">问题名称</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-[#8A8178]">来源日志</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-[#8A8178]">异常类型</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-[#8A8178]">风险等级</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-[#8A8178]">归档状态</th>
                <th className="px-6 py-4 text-right font-label text-[10px] uppercase tracking-widest text-[#8A8178]">归档时间</th>
                <th className="px-6 py-4 text-center font-label text-[10px] uppercase tracking-widest text-[#8A8178]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCCB]">
              {pagedRows.length > 0 ? (
                pagedRows.map((row) => <HistoryCaseTableRow key={row.id} row={row} />)
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="mx-auto max-w-md rounded-[24px] border border-dashed border-[#D8C7AE] bg-[#FBF6ED] px-6 py-10">
                      <span className="material-symbols-outlined text-3xl text-[#B8ADA0]">history</span>
                      <p className="mt-3 text-sm font-medium text-[#6B625B]">当前筛选条件下暂无历史问题记录</p>
                      <p className="mt-1 text-xs text-[#8A8178]">可以尝试调整风险、状态或关键词后重新查看。</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#E2D5C2] bg-[#FBF6ED] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <span className="font-label text-[10px] uppercase tracking-widest text-[#7A6E63]">{`显示 ${start}-${end} 条，共 ${filteredRows.length} 条历史复盘记录`}</span>
          <div className="flex items-center gap-2">
            <PageArrow disabled={safePage <= 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}>chevron_left</PageArrow>
            {Array.from({ length: totalPages }).slice(Math.max(0, safePage - 2), Math.max(0, safePage - 2) + 4).map((_, index) => {
              const page = Math.max(1, safePage - 1) + index;
              if (page > totalPages) return null;
              const active = page === safePage;
              return (
                <button key={page} type="button" onClick={() => setCurrentPage(page)} className={active ? "flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#8A5A2B] px-3 font-bold text-white shadow-[0_8px_18px_rgba(138,90,43,0.24)]" : "flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#D8C7AE] bg-white/30 px-3 text-[#6B625B] transition-all hover:bg-[#EFE4D2]"}>{page}</button>
              );
            })}
            <PageArrow disabled={safePage >= totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}>chevron_right</PageArrow>
          </div>
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <TeaserCard icon="auto_awesome" accent="text-[#8A5A2B]" title="智能修复建议" description="系统已根据历史复盘记录，为高频问题生成了自动化处置建议和复用模板。" href="/dashboard/high-risk" cta="查看复盘" />
        <TeaserCard icon="book" accent="text-[#B07A47]" title="知识沉淀分析" description={`当前已沉淀 ${data.summary.knowledgeTemplateCount} 条有效知识条目，可继续扩展到知识库与规则库。`} href="/dashboard/knowledge" cta="进入知识库" />
        <TeaserCard icon="monitoring" accent="text-[#6B625B]" title="趋势回溯" description={`已归档 ${data.summary.archived} 条记录，其中高风险 ${data.summary.highRisk} 条，可回到工作台继续看趋势图。`} href="/dashboard" cta="查看趋势图" />
      </section>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="glass-panel rounded-xl border border-[#E2D5C2] p-4">
      <label className="mb-3 block font-label text-[10px] uppercase tracking-widest text-[#8A8178]">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full cursor-pointer border-none bg-transparent p-0 text-sm text-[#352E2A] outline-none">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  );
}

function HistoryCaseTableRow({ row }: { row: HistoryCaseRow }) {
  const riskClass = row.riskLabel === "高风险" ? "bg-[#E05B4C] text-[#E05B4C]" : row.riskLabel === "中风险" ? "bg-[#D8A94A] text-[#D8A94A]" : "bg-[#6BAE7A] text-[#6BAE7A]";
  const statusClass = row.reviewStatusLabel === "已复盘" ? "border-[#8A5A2B]/20 bg-[#8A5A2B]/10 text-[#8A5A2B]" : row.reviewStatusLabel === "已归档" ? "border-[#D8C7AE] bg-[#EFE4D2] text-[#6B625B]" : "border-[#E8D3A1] bg-[#FFF5DE] text-[#8A6A24]";
  return (
    <tr className="group transition-colors hover:bg-[#FBF6ED]">
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#352E2A]">{row.title}</span>
          <span className="font-label text-[10px] text-[#8A8178]">{`ID: ${row.incidentId || "-"}`}</span>
        </div>
      </td>
      <td className="px-6 py-5"><span className="rounded bg-white/40 px-2 py-1 text-[10px] font-label text-[#6B625B]">{row.sourceLog}</span></td>
      <td className="px-6 py-5 text-xs text-[#6B625B]">{row.typeLabel}</td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${riskClass.split(" ")[0]}`} />
          <span className={`text-[10px] font-bold uppercase ${riskClass.split(" ")[1]}`}>{row.riskLabel}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold ${statusClass}`}>
          <span className="material-symbols-outlined text-[14px]">{row.reviewStatusLabel === "已复盘" ? "check_circle" : row.reviewStatusLabel === "已归档" ? "archive" : "redo"}</span>
          {row.reviewStatusLabel}
        </span>
      </td>
      <td className="px-6 py-5 text-right font-label text-[10px] text-[#8A8178]">{formatDateTime(row.updatedAt)}</td>
      <td className="px-6 py-5 text-center">
        <Link href={row.logId ? `/dashboard/analyses?logId=${encodeURIComponent(row.logId)}` : "/dashboard/analyses"} className="text-xs font-medium text-[#8A5A2B] transition-all hover:text-[#6D451E] hover:underline">查看复盘</Link>
      </td>
    </tr>
  );
}

function PageArrow({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8C7AE] bg-white/40 text-[#6B625B] transition-all hover:bg-[#EFE4D2] disabled:opacity-40"><span className="material-symbols-outlined text-sm">{children}</span></button>;
}

function TeaserCard({ icon, accent, title, description, href, cta }: { icon: string; accent: string; title: string; description: string; href: string; cta: string }) {
  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl border border-[#E2D5C2] p-6 shadow-[0_10px_24px_rgba(53,46,42,0.05)]">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#8A5A2B]/10 blur-3xl" />
      <span className={`material-symbols-outlined mb-4 ${accent}`}>{icon}</span>
      <h3 className="mb-2 text-lg font-bold text-[#352E2A]">{title}</h3>
      <p className="text-sm leading-7 text-[#6B625B]">{description}</p>
      <Link href={href} className={`mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${accent}`}>{cta}<span className="material-symbols-outlined text-xs">arrow_forward</span></Link>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}




