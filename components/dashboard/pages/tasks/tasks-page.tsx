"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TaskHistoryRow, TasksPageData } from "@/lib/dashboard/tasks";

type TasksPageProps = {
  data: TasksPageData;
};

const PAGE_SIZE = 8;

export function TasksPage({ data }: TasksPageProps) {
  const [rows, setRows] = useState(data.rows);
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState("最近 7 天");
  const [currentPage, setCurrentPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      const keywordMatch =
        normalizedKeyword.length === 0 ||
        String(row.fileName ?? "").toLowerCase().includes(normalizedKeyword) ||
        String(row.id ?? "").toLowerCase().includes(normalizedKeyword);
      const dateMatch = matchesDateRange(row.createdAt, range);
      return keywordMatch && dateMatch;
    });
  }, [keyword, range, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filteredRows.length);

  async function handleDownload(logId: string) {
    if (!logId || busyId) return;
    setBusyId(logId);
    try {
      const response = await fetch("/api/inner-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "history-download", logId }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; downloadUrl?: string } | null;
      if (!response.ok || !payload?.downloadUrl) {
        throw new Error(payload?.error || "下载链接生成失败，请稍后重试。");
      }
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "下载失败，请稍后重试。");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(logId: string, fileName: string | null) {
    if (!logId || busyId) return;
    const confirmed = window.confirm(`确认删除“${fileName || "这条历史日志"}”吗？删除后无法恢复。`);
    if (!confirmed) return;

    setBusyId(logId);
    try {
      const response = await fetch("/api/inner-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "history-delete", logId }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "删除失败，请稍后重试。");
      }

      setRows((current) => current.filter((item) => item.id !== logId));
      setCurrentPage((page) => Math.max(1, page > 1 && (filteredRows.length - 1) <= (page - 1) * PAGE_SIZE ? page - 1 : page));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="relative mb-8">
        <div className="absolute -left-20 -top-16 h-48 w-48 rounded-full bg-[#8A5A2B]/10 blur-[90px]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mb-2 font-headline text-4xl font-black tracking-tight text-[#352E2A]">历史日志存档</h1>
            <p className="max-w-3xl text-sm leading-6 text-[#6B625B]">查看、筛选并分析过去所有的日志运行记录。系统自动保留最近 90 天的详细分析报告及元数据。</p>
          </div>
        </div>
      </div>

      <section className="glass-panel mb-8 rounded-[22px] border border-[#E2D5C2] p-4 shadow-[0_10px_24px_rgba(53,46,42,0.05)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            className="rounded-xl border border-[#8A5A2B]/30 bg-gradient-to-r from-[#8A5A2B]/20 to-transparent px-4 py-3 text-center text-sm font-bold text-[#8A5A2B]"
          >
            历史日志存档（当前）
          </button>
          <Link
            href="/dashboard/history-cases"
            className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]"
          >
            历史问题库
          </Link>
          <Link
            href="/dashboard/knowledge"
            className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]"
          >
            探索根因知识库
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="glass-panel rounded-[22px] border border-[#E2D5C2] p-4 md:col-span-2">
              <label className="mb-3 block font-label text-[10px] uppercase tracking-[0.24em] text-[#8A8178]">关键词检索</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-[#8A5A2B]">manage_search</span>
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="输入日志名称或任务 ID..."
                  className="w-full border-none bg-transparent pl-8 text-sm text-[#352E2A] outline-none placeholder:text-[#8C7F72]"
                />
              </div>
            </div>
            <div className="glass-panel rounded-[22px] border border-[#E2D5C2] p-4">
              <label className="mb-3 block font-label text-[10px] uppercase tracking-[0.24em] text-[#8A8178]">日期范围</label>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-[#B8ADA0]">calendar_month</span>
                <select
                  value={range}
                  onChange={(event) => {
                    setRange(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full cursor-pointer border-none bg-transparent text-sm text-[#352E2A] outline-none"
                >
                  <option>最近 7 天</option>
                  <option>最近 30 天</option>
                  <option>2023年第四季度</option>
                  <option>全部时间</option>
                </select>
              </div>
            </div>
            <div className="glass-panel flex items-center justify-center rounded-[22px] border border-[#E2D5C2] p-4">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBF6ED] py-3 text-sm font-bold text-[#8A5A2B] transition-all hover:bg-[#F3EBDD]"
              >
                <span className="material-symbols-outlined">filter_list</span>
                <span>执行筛选</span>
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#E2D5C2] bg-[#F7F2E8] shadow-[0_14px_34px_rgba(53,46,42,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E2D5C2] bg-[#FBF6ED]">
                    <th className="px-6 py-4 font-label text-[11px] font-medium uppercase tracking-[0.24em] text-[#8A8178]">日志名称</th>
                    <th className="px-6 py-4 text-center font-label text-[11px] font-medium uppercase tracking-[0.24em] text-[#8A8178]">分析状态</th>
                    <th className="px-6 py-4 font-label text-[11px] font-medium uppercase tracking-[0.24em] text-[#8A8178]">上传时间</th>
                    <th className="px-6 py-4 font-label text-[11px] font-medium uppercase tracking-[0.24em] text-[#8A8178]">文件大小</th>
                    <th className="px-6 py-4 text-right font-label text-[11px] font-medium uppercase tracking-[0.24em] text-[#8A8178]">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCCB]">
                  {pagedRows.length > 0 ? (
                    pagedRows.map((row) => (
                      <TaskRow
                        key={row.id}
                        row={row}
                        busy={busyId === row.id}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="mx-auto max-w-md rounded-[24px] border border-dashed border-[#D8C7AE] bg-[#FBF6ED] px-6 py-10">
                          <span className="material-symbols-outlined text-3xl text-[#B8ADA0]">history</span>
                          <p className="mt-3 text-sm font-medium text-[#6B625B]">当前筛选条件下暂无历史日志</p>
                          <p className="mt-1 text-xs text-[#8A8178]">可以尝试调整关键词或日期范围后重新查看。</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-[#E2D5C2] bg-[#FBF6ED] px-6 py-4 md:flex-row md:items-center md:justify-between">
              <span className="font-label text-[11px] uppercase tracking-[0.24em] text-[#7A6E63]">{`显示 ${start}-${end} 条，共 ${filteredRows.length} 条记录`}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8C7AE] bg-white/40 text-[#6B625B] transition-all hover:bg-[#EFE4D2] disabled:opacity-40"
                  disabled={safePage <= 1}
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }).slice(Math.max(0, safePage - 2), Math.max(0, safePage - 2) + 3).map((_, index) => {
                  const page = Math.max(1, safePage - 1) + index;
                  if (page > totalPages) return null;
                  const active = page === safePage;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={
                        active
                          ? "flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#8A5A2B] px-3 font-bold text-white shadow-[0_8px_18px_rgba(138,90,43,0.24)]"
                          : "flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#D8C7AE] bg-white/30 px-3 text-[#6B625B] transition-all hover:bg-[#EFE4D2]"
                      }
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8C7AE] bg-white/40 text-[#6B625B] transition-all hover:bg-[#EFE4D2] disabled:opacity-40"
                  disabled={safePage >= totalPages}
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="obsidian-card relative overflow-hidden rounded-[28px] border border-[#E2D5C2] p-6 shadow-[0_12px_30px_rgba(53,46,42,0.08)]">
            <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-[#8A5A2B]/10 blur-[60px]" />
            <div className="relative z-10">
              <h3 className="mb-4 text-lg font-bold text-[#352E2A]">知识沉淀</h3>
              <p className="mb-6 text-sm leading-7 text-[#6B625B]">
                基于历史日志，系统已自动生成 {data.overview.knowledgeTemplateCount} 个通用解决方案模板。这些模板可显著缩短同类问题的排查时间。
              </p>
              <Link
                href="/dashboard/knowledge"
                className="inline-flex items-center rounded-xl bg-[#8A5A2B]/15 px-4 py-2 text-xs font-bold text-[#8A5A2B] transition-all hover:bg-[#8A5A2B]/25"
              >
                进入知识库 →
              </Link>
            </div>
          </section>

          <section className="obsidian-card rounded-[28px] border border-[#E2D5C2] p-6 shadow-[0_12px_30px_rgba(53,46,42,0.08)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#352E2A]">分析趋势预览</h3>
                <p className="mt-2 text-xs leading-6 text-[#8A8178]">柱条表示最近 8 天每天的分析任务数，最右侧为最新一天。</p>
              </div>
            </div>
            <div className="mb-3 flex items-center gap-4 text-[10px] text-[#8A8178]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-[#8A5A2B]/20 bg-[#8A5A2B]/35" />
                日任务数
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-[#8A5A2B]/40 bg-[#8A5A2B]" />
                最新一天
              </span>
            </div>
            <div className="flex h-32 items-end gap-1.5">
              {data.overview.trend.length > 0 ? (
                data.overview.trend.map((item, index) => {
                  const isLast = index === data.overview.trend.length - 1;
                  return (
                    <div
                      key={`${item.label}-${index}`}
                      title={`${item.label}：${item.count} 条`}
                      className={
                        isLast
                          ? "flex-1 rounded-t-sm border border-[#8A5A2B]/40 bg-[#8A5A2B] shadow-[0_-10px_20px_rgba(168,115,58,0.28)]"
                          : "flex-1 rounded-t-sm border border-[#8A5A2B]/20 bg-[#8A5A2B]/35 transition-all hover:bg-[#8A5A2B]/55"
                      }
                      style={{ height: `${item.heightPercent}%` }}
                    />
                  );
                })
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-[#D8C7AE] bg-[#FBF6ED] text-sm text-[#8A8178]">
                  暂无趋势数据
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-between px-1">
              <span className="font-label text-[9px] uppercase tracking-[0.24em] text-[#B8ADA0]">{data.overview.trend[0]?.label ?? "-"}</span>
              <span className="font-label text-[9px] uppercase tracking-[0.24em] text-[#B8ADA0]">{data.overview.trend[data.overview.trend.length - 1]?.label ?? "今日"}</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#FBF6ED] p-4">
                <span className="block text-[10px] text-[#8A8178]">总存储容量</span>
                <span className="mt-1 block font-label text-xl font-bold text-[#352E2A]">{data.overview.totalStorageGb}</span>
              </div>
              <div className="rounded-2xl bg-[#FBF6ED] p-4">
                <span className="block text-[10px] text-[#8A8178]">本月任务数</span>
                <span className="mt-1 block font-label text-xl font-bold text-[#8A5A2B]">{data.overview.monthTaskCount} 次</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

type TaskRowProps = {
  row: TaskHistoryRow;
  busy: boolean;
  onDownload: (logId: string) => void;
  onDelete: (logId: string, fileName: string | null) => void;
};

function TaskRow({ row, busy, onDownload, onDelete }: TaskRowProps) {
  const completed = row.statusLabel === "已完成";
  const failed = row.statusLabel === "已失败";

  return (
    <tr className="group transition-colors hover:bg-[#FBF6ED]">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#B8ADA0] transition-colors group-hover:text-[#8A5A2B]">description</span>
          <div>
            <p className="text-sm font-medium text-[#352E2A]">{row.fileName || "未命名日志"}</p>
            <p className="mt-1 text-xs text-[#8A8178]">
              {row.issueCount} 个问题 · {row.riskLabel}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 text-center">
        <span
          className={
            completed
              ? "inline-flex items-center rounded-full border border-[#BFDDC9] bg-[#E8F4EC] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2F6A42]"
              : failed
                ? "inline-flex items-center rounded-full border border-[#F4B7C1] bg-[#FFE2E6] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9B1B30]"
                : "inline-flex items-center rounded-full border border-[#E8D3A1] bg-[#FFF5DE] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A6A24]"
          }
        >
          {row.statusLabel}
        </span>
      </td>
      <td className="px-6 py-5">
        <span className="font-label text-xs text-[#6B625B]">{formatDateTime(row.createdAt)}</span>
      </td>
      <td className="px-6 py-5">
        <span className="font-label text-xs text-[#6B625B]">{row.sizeLabel}</span>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-4">
          {completed ? (
            <Link href={`/dashboard/analyses?logId=${encodeURIComponent(row.id)}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#8A5A2B] transition-all hover:text-[#6D451E]">
              <span className="material-symbols-outlined text-sm">visibility</span>
              查看报告
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1 text-xs font-bold text-[#B8ADA0]"
            >
              <span className="material-symbols-outlined text-sm">hourglass_empty</span>
              处理中
            </button>
          )}
          <button
            type="button"
            onClick={() => onDownload(row.id)}
            disabled={busy}
            className="text-[#8A5A2B] transition-all hover:text-[#6D451E] disabled:opacity-40"
            title="下载日志"
          >
            <span className="material-symbols-outlined text-sm">download</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.id, row.fileName)}
            disabled={busy}
            className="text-[#B8ADA0] transition-all hover:text-[#B23A3A] disabled:opacity-40"
            title="删除日志"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

function matchesDateRange(value: string, rangeLabel: string) {
  const createdAt = new Date(value);
  if (!Number.isFinite(createdAt.getTime())) {
    return true;
  }

  const now = new Date();
  if (rangeLabel === "最近 7 天") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return createdAt >= start;
  }

  if (rangeLabel === "最近 30 天") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return createdAt >= start;
  }

  if (rangeLabel === "2023年第四季度") {
    const start = new Date("2023-10-01T00:00:00");
    const end = new Date("2024-01-01T00:00:00");
    return createdAt >= start && createdAt < end;
  }

  return true;
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






