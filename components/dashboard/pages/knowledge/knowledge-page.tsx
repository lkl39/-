"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { KnowledgePageData, KnowledgeRow } from "@/lib/dashboard/knowledge";

type KnowledgePageProps = {
  data: KnowledgePageData;
};

const PAGE_SIZE = 4;

export function KnowledgePage({ data }: KnowledgePageProps) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState<KnowledgeRow | null>(null);

  const categoryOptions = useMemo(() => Array.from(new Set(data.rows.map((item) => item.category).filter(Boolean))), [data.rows]);
  const sourceOptions = useMemo(() => Array.from(new Set(data.rows.map((item) => item.sourceLabel).filter(Boolean))), [data.rows]);
  const hotKeywords = useMemo(() => data.rows.slice(0, 4).map((item) => item.displayTitle), [data.rows]);

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return data.rows.filter((row) => {
      const keywordMatch =
        normalizedKeyword.length === 0 ||
        [row.displayTitle, row.title, row.summary, row.cause, row.solutionPreview, row.sourceLabel, row.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword);
      const categoryMatch = !category || row.category === category;
      const sourceMatch = !source || row.sourceLabel === source;
      return keywordMatch && categoryMatch && sourceMatch;
    });
  }, [category, data.rows, keyword, source]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-7xl text-[#352E2A]">
      <section className="relative mb-12">
        <div className="absolute -left-20 -top-16 h-48 w-48 rounded-full bg-[#8A5A2B]/10 blur-[90px]" />
        <div className="absolute -right-12 -top-6 h-36 w-36 rounded-full bg-[#B07A47]/10 blur-[70px]" />
        <div className="relative z-10">
          <h1 className="mb-8 font-headline text-5xl font-extrabold tracking-tight">探索根因知识库</h1>

          <section className="glass-panel sticky top-20 z-20 mb-8 rounded-2xl border border-[#E2D5C2] p-4 shadow-[0_10px_24px_rgba(53,46,42,0.05)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-label text-[10px] uppercase tracking-widest text-[#8A8178]">历史与知识自由切换</p>
              <span className="text-[10px] text-[#B8ADA0]">在三个页面之间快速跳转</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Link href="/dashboard/tasks" className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]">历史日志存档</Link>
              <Link href="/dashboard/history-cases" className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]">历史问题库</Link>
              <button type="button" className="rounded-xl border border-[#8A5A2B]/30 bg-gradient-to-r from-[#8A5A2B]/20 to-transparent px-4 py-3 text-sm font-bold text-[#8A5A2B]">探索根因知识库（当前）</button>
            </div>
          </section>

          <div className="relative group">
            <div className="relative flex items-center rounded-2xl border border-[#E2D5C2] bg-[#F7F2E8] p-2 shadow-2xl transition-all focus-within:border-[#8A5A2B]/40">
              <span className="material-symbols-outlined ml-4 text-[#8A5A2B]">search</span>
              <input
                value={keyword}
                onChange={(event) => { setKeyword(event.target.value); setCurrentPage(1); }}
                className="w-full border-none bg-transparent px-4 py-4 text-lg text-[#352E2A] outline-none placeholder:text-[#8C7F72]"
                placeholder="输入故障现象、案例标题或异常类型进行深度搜索..."
                type="text"
              />
              <button
                type="button"
                onClick={() => setShowAdvanced((value) => !value)}
                className="mr-2 whitespace-nowrap rounded-xl border border-[#E2D5C2] bg-white/50 px-6 py-3 text-sm font-label text-[#6B625B] transition-all hover:bg-white/80"
              >
                高级筛选
              </button>
            </div>
          </div>

          {showAdvanced ? (
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#E2D5C2] bg-[#F7F2E8] p-4 md:grid-cols-3">
              <FilterSelect label="分类" value={category} options={categoryOptions} placeholder="全部分类" onChange={(value) => { setCategory(value); setCurrentPage(1); }} />
              <FilterSelect label="来源" value={source} options={sourceOptions} placeholder="全部来源" onChange={(value) => { setSource(value); setCurrentPage(1); }} />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => { setKeyword(""); setCategory(""); setSource(""); setCurrentPage(1); }}
                  className="w-full rounded-lg border border-[#E2D5C2] bg-white/50 py-2 text-xs font-label uppercase tracking-widest text-[#6B625B] transition-all hover:bg-white/80"
                >
                  重置筛选
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="pt-1 text-xs font-label uppercase tracking-widest text-[#8A8178]">热门搜索:</span>
            {hotKeywords.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setKeyword(item); setCurrentPage(1); }}
                className="rounded-full border border-[#E2D5C2] bg-[#F7F2E8] px-3 py-1 text-xs text-[#6B625B] transition-all hover:border-[#8A5A2B]/30 hover:text-[#8A5A2B]"
              >
                #{item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {pagedRows.length > 0 ? (
          pagedRows.map((row, index) => <KnowledgeCard key={row.id} row={row} index={index} onOpen={() => setSelected(row)} />)
        ) : (
          <div className="glass-card rounded-2xl border border-dashed border-[#D8C7AE] p-8 text-sm text-[#6B625B] lg:col-span-2">未找到匹配的知识条目</div>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <span className="font-label text-[10px] uppercase tracking-widest text-[#7A6E63]">共 {filteredRows.length} 条知识条目</span>
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

      {selected ? <KnowledgeDetailModal row={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function FilterSelect({ label, value, options, placeholder, onChange }: { label: string; value: string; options: string[]; placeholder: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-label uppercase tracking-widest text-[#8A8178]">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border-none bg-[#FBF6ED] px-3 py-2 text-xs text-[#352E2A] outline-none focus:ring-1 focus:ring-[#8A5A2B]">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function KnowledgeCard({ row, index, onOpen }: { row: KnowledgeRow; index: number; onOpen: () => void }) {
  return (
    <article className="glass-card group cursor-pointer rounded-2xl border border-[#E2D5C2] p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_40px_-10px_rgba(168,115,58,0.15)]" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}>
      <div className="mb-6 flex items-start justify-between">
        <span className={`rounded-md border px-3 py-1 text-[10px] font-label font-bold uppercase tracking-wider ${tagClass(row.category, index)}`}>
          {categoryTag(row.category)}
        </span>
        <span className="text-[10px] font-label uppercase tracking-widest text-[#8A8178]">来源：{row.sourceLabel}</span>
      </div>
      <h3 className="mb-4 font-headline text-2xl font-bold transition-colors group-hover:text-[#8A5A2B]">{row.displayTitle}</h3>
      <div className="mb-8 space-y-4">
        <div>
          <p className="mb-1 text-[10px] font-label uppercase tracking-widest text-[#8A8178]">根因摘要</p>
          <p className="line-clamp-2 text-sm leading-relaxed text-[#6B625B]">{row.summary}</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-label uppercase tracking-widest text-[#8A8178]">解决方案预览</p>
          <p className="line-clamp-2 text-sm italic leading-relaxed text-[#8C7F72]">{row.solutionPreview}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#E2D5C2] pt-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-sm text-[#B8ADA0]">source</span>
          <span className="font-label text-xs text-[#8A8178]">{row.sourceLabel}</span>
        </div>
        <span className="material-symbols-outlined text-[#B8ADA0] transition-all group-hover:translate-x-1 group-hover:text-[#8A5A2B]">arrow_forward</span>
      </div>
    </article>
  );
}

function KnowledgeDetailModal({ row, onClose }: { row: KnowledgeRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(53,46,42,0.28)] p-6 backdrop-blur-[3px]" onClick={onClose}>
      <div className="glass-panel w-full max-w-3xl rounded-[28px] border border-[#D8C7AE] bg-[#FBF6EC] p-8 shadow-[0_18px_42px_rgba(53,46,42,0.18)]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-md border border-[#8A5A2B]/20 bg-[#8A5A2B]/10 px-3 py-1 text-[10px] font-label font-bold uppercase tracking-wider text-[#8A5A2B]">{categoryTag(row.category)}</span>
            <h3 className="mt-4 font-headline text-3xl font-extrabold text-[#352E2A]">{row.displayTitle}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#6B625B] transition hover:bg-[#EFE4D2] hover:text-[#352E2A]"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="space-y-5">
          <DetailBlock label="根因摘要" value={row.summary} />
          <DetailBlock label="根因分析" value={row.cause} />
          <DetailBlock label="解决方案" value={row.solutionPreview} />
          <DetailBlock label="来源" value={row.sourceLabel} />
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-label uppercase tracking-widest text-[#8A8178]">{label}</p>
      <p className="text-sm leading-7 text-[#4A4038]">{value}</p>
    </div>
  );
}

function PageArrow({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: string }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8C7AE] bg-white/40 text-[#6B625B] transition-all hover:bg-[#EFE4D2] disabled:opacity-40"><span className="material-symbols-outlined text-sm">{children}</span></button>;
}

function categoryTag(category: string) {
  const key = String(category || "").toLowerCase();
  if (key.includes("security") || key.includes("auth")) return "安全告警";
  if (key.includes("timeout")) return "网络超时";
  if (key.includes("db") || key.includes("database")) return "数据库性能";
  if (key.includes("critical")) return "严重故障";
  return "知识条目";
}

function tagClass(category: string, index: number) {
  const key = String(category || "").toLowerCase();
  if (key.includes("security") || key.includes("auth")) return "border-[#E05B4C]/20 bg-[#E05B4C]/10 text-[#E05B4C]";
  if (key.includes("timeout")) return "border-[#B07A47]/20 bg-[#B07A47]/10 text-[#B07A47]";
  if (key.includes("db") || key.includes("database")) return "border-[#C58B52]/20 bg-[#C58B52]/10 text-[#C58B52]";
  if (key.includes("critical")) return "border-[#8A5A2B]/20 bg-[#8A5A2B]/10 text-[#8A5A2B]";
  return index % 2 === 0 ? "border-[#8A5A2B]/20 bg-[#8A5A2B]/10 text-[#8A5A2B]" : "border-[#B07A47]/20 bg-[#B07A47]/10 text-[#B07A47]";
}
