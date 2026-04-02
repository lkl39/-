"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { RuleRow, RulesPageData } from "@/lib/dashboard/rules";

type RulesPageProps = {
  data: RulesPageData;
};

const PAGE_SIZE = 10;

export function RulesPage({ data }: RulesPageProps) {
  const [rows, setRows] = useState(data.rows);
  const [stats, setStats] = useState(data.stats);
  const [typeFilter, setTypeFilter] = useState("全部类型");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [currentPage, setCurrentPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const filterSectionRef = useRef<HTMLElement | null>(null);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const typeMatch = typeFilter === "全部类型" || toTypeLabel(row.matchType) === typeFilter;
      const statusMatch =
        statusFilter === "全部状态" ||
        (statusFilter === "已启用" && row.enabled) ||
        (statusFilter === "已停用" && !row.enabled) ||
        (statusFilter === "报错中" && row.enabled && row.riskLevel === "high");

      return typeMatch && statusMatch;
    });
  }, [rows, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filteredRows.length);

  async function refreshRules() {
    const response = await fetch("/api/inner-data?view=rules", { credentials: "include" });
    const payload = (await response.json().catch(() => null)) as RulesPageData | { error?: string } | null;
    if (!response.ok || !payload || !("rows" in payload) || !("stats" in payload)) {
      throw new Error((payload && "error" in payload && payload.error) || "规则数据刷新失败。");
    }

    setRows(payload.rows);
    setStats(payload.stats);
  }

  async function postAction(body: Record<string, unknown>) {
    const response = await fetch("/api/inner-data", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "规则操作失败，请稍后重试。");
    }
  }

  function scrollToFilters() {
    filterSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleToggle(row: RuleRow) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await postAction({ action: "rules-toggle", ruleId: row.id, enabled: !row.enabled });
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() } : item)),
      );
      setStats((current) => ({
        ...current,
        enabled: current.enabled + (row.enabled ? -1 : 1),
        paused: current.paused + (row.enabled ? 1 : -1),
        warnings: row.riskLevel === "high" ? current.warnings + (row.enabled ? -1 : 1) : current.warnings,
      }));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "规则状态更新失败。");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRename(row: RuleRow) {
    if (busyId) return;
    const nextName = window.prompt("请输入新的规则名称", row.displayName || row.name || "");
    if (!nextName || !nextName.trim()) return;

    setBusyId(row.id);
    try {
      await postAction({ action: "rules-rename", ruleId: row.id, ruleName: nextName.trim() });
      await refreshRules();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "规则重命名失败。");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(row: RuleRow) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await postAction({ action: "rules-duplicate", ruleId: row.id });
      await refreshRules();
      window.alert("规则副本已创建。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "规则复制失败。");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(row: RuleRow) {
    if (busyId) return;
    if (!window.confirm(`确认删除规则“${row.displayName}”吗？删除后不可恢复。`)) return;

    setBusyId(row.id);
    try {
      await postAction({ action: "rules-delete", ruleId: row.id });
      setRows((current) => current.filter((item) => item.id !== row.id));
      setStats((current) => ({
        total: Math.max(0, current.total - 1),
        enabled: row.enabled ? Math.max(0, current.enabled - 1) : current.enabled,
        paused: row.enabled ? current.paused : Math.max(0, current.paused - 1),
        warnings: row.enabled && row.riskLevel === "high" ? Math.max(0, current.warnings - 1) : current.warnings,
      }));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "规则删除失败。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="mb-2 font-headline text-4xl font-extrabold tracking-tight text-[#352E2A]">规则配置管理</h1>
            <p className="text-sm leading-relaxed text-[#6B625B]">
              规则来源于用户使用中未被系统覆盖的问题，经人工复核沉淀到知识库后，在多次复现时转化为可执行规则。
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={scrollToFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DECDB6] bg-[#F7F2E8] px-6 py-2.5 font-label text-xs uppercase tracking-widest text-[#6B625B] transition-all hover:border-[#C79B68]"
            >
              <span className="material-symbols-outlined text-base">filter_list</span>
              过滤条件
            </button>
          </div>
        </div>
      </header>

      <section className="glass-panel sticky top-20 z-20 mb-8 rounded-2xl border border-[#E2D5C2] p-4 shadow-[0_10px_24px_rgba(53,46,42,0.05)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-label text-[10px] uppercase tracking-widest text-[#8A8178]">系统管理自由切换</p>
          <span className="text-[10px] text-[#B8ADA0]">在三个页面之间快速跳转</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            className="rounded-xl border border-[#8A5A2B]/30 bg-gradient-to-r from-[#8A5A2B]/20 to-transparent px-4 py-3 text-sm font-bold text-[#8A5A2B]"
          >
            规则配置（当前）
          </button>
          <Link
            href="/dashboard/performance"
            className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]"
          >
            性能分析
          </Link>
          <Link
            href="/dashboard/settings"
            className="rounded-xl border border-[#E2D5C2] bg-white/25 px-4 py-3 text-center text-sm font-medium text-[#6B625B] transition-all hover:border-[#D1B58A] hover:text-[#352E2A]"
          >
            系统设置
          </Link>
        </div>
      </section>

      <section className="glass-panel mb-8 flex flex-col gap-3 rounded-2xl border border-[#E2D5C2] p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-relaxed text-[#6B625B]">沉淀链路：用户遇到系统未覆盖问题 → 人工复核确认 → 知识库沉淀 → 高频复现写入规则库。</p>
        <Link href="/dashboard/history-cases" className="inline-flex items-center gap-2 text-xs font-bold text-[#8A5A2B] transition-colors hover:text-[#6D451E]">
          <span className="material-symbols-outlined text-sm">schema</span>
          <span>查看沉淀来源</span>
        </Link>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatsCard icon="rule" label="总计" value={stats.total} help="当前激活规则总数" iconColor="text-[#8A5A2B]" />
        <StatsCard icon="check_circle" label="启用" value={stats.enabled} help="正在运行中" iconColor="text-[#3B925F]" />
        <StatsCard icon="warning" label="警报" value={stats.warnings} help="规则逻辑报错" iconColor="text-[#E68A17]" />
        <StatsCard icon="pause_circle" label="暂停" value={stats.paused} help="已手动停用" iconColor="text-[#B88A24]" />
      </section>

      <section ref={filterSectionRef} className="glass-panel overflow-hidden rounded-2xl border border-[#E2D5C2] shadow-[0_12px_30px_rgba(53,46,42,0.06)]">
        <div className="flex flex-col gap-4 border-b border-[#E2D5C2] bg-[#FBF6ED] px-8 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:gap-8">
            <FilterSelect
              label="规则类型"
              value={typeFilter}
              options={["全部类型", "正则匹配", "AI 语义", "关键词"]}
              onChange={(value) => {
                setTypeFilter(value);
                setCurrentPage(1);
              }}
            />
            <FilterSelect
              label="运行状态"
              value={statusFilter}
              options={["全部状态", "已启用", "已停用", "报错中"]}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            />
          </div>
          <span className="text-xs italic text-[#8A8178]">{`显示 ${start}-${end} 条，共 ${filteredRows.length.toLocaleString("zh-CN")} 条记录`}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2D5C2] bg-white/30">
                <th className="px-8 py-4 font-label text-[10px] font-medium uppercase tracking-widest text-[#8A8178]">规则名称与 ID</th>
                <th className="px-6 py-4 font-label text-[10px] font-medium uppercase tracking-widest text-[#8A8178]">类型</th>
                <th className="px-6 py-4 font-label text-[10px] font-medium uppercase tracking-widest text-[#8A8178]">描述</th>
                <th className="px-6 py-4 font-label text-[10px] font-medium uppercase tracking-widest text-[#8A8178]">最后更新</th>
                <th className="px-6 py-4 font-label text-[10px] font-medium uppercase tracking-widest text-[#8A8178]">运行状态</th>
                <th className="px-8 py-4 text-right font-label text-[10px] font-medium uppercase tracking-widest text-[#8A8178]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCCB]">
              {pagedRows.length > 0 ? (
                pagedRows.map((row) => (
                  <RuleTableRow
                    key={row.id}
                    row={row}
                    busy={busyId === row.id}
                    onToggle={handleToggle}
                    onRename={handleRename}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-sm text-[#8A8178]">
                    当前筛选条件下暂无规则数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#E2D5C2] bg-[#FBF6ED] px-8 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
              className="flex h-8 w-8 items-center justify-center rounded border border-[#D8C7AE] bg-white/30 text-[#6B625B] transition-all hover:bg-[#EFE4D2] disabled:opacity-30"
              disabled={safePage <= 1}
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }).slice(Math.max(0, safePage - 2), Math.max(0, safePage - 2) + 4).map((_, index) => {
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
                      ? "flex h-8 min-w-8 items-center justify-center rounded bg-[#8A5A2B] px-3 text-xs font-bold text-white"
                      : "flex h-8 min-w-8 items-center justify-center rounded border border-[#D8C7AE] bg-white/30 px-3 text-xs text-[#6B625B] transition-all hover:bg-[#EFE4D2]"
                  }
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
              className="flex h-8 w-8 items-center justify-center rounded border border-[#D8C7AE] bg-white/30 text-[#6B625B] transition-all hover:bg-[#EFE4D2] disabled:opacity-30"
              disabled={safePage >= totalPages}
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          <div className="flex items-center gap-4 font-label text-[10px] uppercase tracking-widest text-[#8A8178]">
            <span>跳至</span>
            <input value={String(safePage)} readOnly className="h-8 w-12 rounded border border-[#D8C7AE] bg-white/30 text-center text-[#352E2A]" />
            <span>页</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
  help,
  iconColor,
}: {
  icon: string;
  label: string;
  value: number;
  help: string;
  iconColor: string;
}) {
  return (
    <div className="glass-panel rounded-2xl border border-[#E2D5C2] p-6 shadow-[0_10px_24px_rgba(53,46,42,0.05)]">
      <div className="mb-4 flex items-start justify-between">
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
        <span className="font-label text-[10px] uppercase tracking-widest text-[#8A8178]">{label}</span>
      </div>
      <div className="font-headline text-3xl font-bold text-[#352E2A]">{value.toLocaleString("zh-CN")}</div>
      <div className="mt-1 text-xs text-[#8A8178]">{help}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-[140px] flex-col gap-2 text-xs text-[#8A8178]">
      <span className="font-label uppercase tracking-widest">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-[#D8C7AE] bg-white/40 px-4 py-2.5 text-sm text-[#352E2A] outline-none transition-all focus:border-[#D1B58A]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RuleTableRow({
  row,
  busy,
  onToggle,
  onRename,
  onDuplicate,
  onDelete,
}: {
  row: RuleRow;
  busy: boolean;
  onToggle: (row: RuleRow) => void;
  onRename: (row: RuleRow) => void;
  onDuplicate: (row: RuleRow) => void;
  onDelete: (row: RuleRow) => void;
}) {
  return (
    <tr className="bg-white/20 transition-all hover:bg-white/35">
      <td className="px-8 py-5 align-top">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => onToggle(row)}
            className={
              row.enabled
                ? "mt-1 inline-flex h-6 w-10 items-center rounded-full bg-[#8A5A2B] px-1 transition-transform active:scale-95"
                : "mt-1 inline-flex h-6 w-10 items-center rounded-full bg-[#E2D5C2] px-1 transition-transform active:scale-95"
            }
            disabled={busy}
          >
            <span
              className={
                row.enabled
                  ? "h-4 w-4 translate-x-4 rounded-full bg-white shadow"
                  : "h-4 w-4 translate-x-0 rounded-full bg-white shadow"
              }
            ></span>
          </button>
          <div>
            <div className="font-medium text-[#352E2A]">{row.displayName}</div>
            <div className="font-mono text-[11px] text-[#8A8178]">{row.id}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 align-top">
        <span className="inline-flex rounded-full border border-[#D8C7AE] bg-[#F7F2E8] px-3 py-1 text-xs text-[#6B625B]">{toTypeLabel(row.matchType)}</span>
      </td>
      <td className="px-6 py-5 align-top">
        <div className="max-w-md text-sm leading-relaxed text-[#6B625B]">{row.summary}</div>
      </td>
      <td className="px-6 py-5 align-top text-sm text-[#6B625B]">{formatDate(row.updatedAt)}</td>
      <td className="px-6 py-5 align-top">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold">
          <span className={`h-2 w-2 rounded-full ${row.enabled ? "bg-[#3B925F]" : "bg-[#B8ADA0]"}`}></span>
          <span className={row.enabled ? "text-[#3B925F]" : "text-[#8A8178]"}>{row.enabled ? "启用中" : "已停用"}</span>
        </div>
      </td>
      <td className="px-8 py-5 align-top">
        <div className="flex justify-end gap-2 text-xs">
          <ActionButton label="重命名" busy={busy} onClick={() => onRename(row)} />
          <ActionButton label="复制" busy={busy} onClick={() => onDuplicate(row)} />
          <ActionButton label="删除" busy={busy} danger onClick={() => onDelete(row)} />
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  label,
  onClick,
  busy,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        danger
          ? "rounded-lg border border-[#E8C7C7] bg-[#FFF3F3] px-3 py-2 text-[#B23A3A] transition-all hover:border-[#D89D9D] disabled:opacity-50"
          : "rounded-lg border border-[#D8C7AE] bg-[#FBF6ED] px-3 py-2 text-[#6B625B] transition-all hover:border-[#C79B68] hover:text-[#352E2A] disabled:opacity-50"
      }
    >
      {label}
    </button>
  );
}

function toTypeLabel(value: string) {
  if (value === "regex") return "正则匹配";
  if (value === "keyword") return "关键词";
  return "AI 语义";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
