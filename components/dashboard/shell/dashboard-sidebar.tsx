"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "工作台" },
  { href: "/upload", icon: "analytics", label: "日志分析" },
  { href: "/dashboard/incidents", icon: "biotech", label: "问题处理" },
  { href: "/dashboard/tasks", icon: "history_edu", label: "历史与知识" },
  { href: "/dashboard/rules", icon: "settings_suggest", label: "系统管理" },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const primaryActionHref = pathname === "/upload" ? "/dashboard/high-risk" : "/upload";
  const primaryActionLabel = pathname === "/upload" ? "进入分析记录" : "开始新分析";

  return (
    <aside className="absolute left-0 top-0 z-[60] hidden h-full w-64 flex-col border-r border-white/5 bg-[#B57743] shadow-[4px_0_24px_rgba(0,0,0,0.24)] md:flex">
      <div className="px-6 py-8">
        <h1 className="font-headline text-xl font-black tracking-tight text-white">智能日志分析系统</h1>
        <p className="mt-1 font-label text-[10px] uppercase tracking-widest text-white/40">曜石智能日志平台</p>
      </div>
      <nav className="mt-4 flex flex-col space-y-2 px-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/upload" &&
              (pathname === "/dashboard/high-risk" ||
                pathname === "/dashboard/analyses" ||
                pathname.startsWith("/dashboard/logs/"))) ||
            (item.href === "/dashboard/incidents" && pathname === "/dashboard/reviews") ||
            (item.href === "/dashboard/tasks" && (pathname === "/dashboard/history-cases" || pathname === "/dashboard/knowledge")) ||
            (item.href === "/dashboard/rules" && (pathname === "/dashboard/account" || pathname === "/dashboard/settings" || pathname === "/dashboard/performance"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center space-x-3 rounded-xl border-r-4 border-[#A8733A] bg-[#F7F2E8] px-4 py-3 text-[#352E2A] backdrop-blur-md transition-all duration-300"
                  : "flex items-center space-x-3 rounded-xl px-4 py-3 text-[#352E2A] transition-all duration-200 hover:bg-[#F7F2E8]/70 hover:text-[#352E2A]"
              }
            >
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-label text-sm uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-6 py-8">
        <Link
          href={primaryActionHref}
          className="block w-full rounded-xl bg-[#F7F2E8] py-3 text-center text-sm font-bold text-[#352E2A] shadow-lg transition-transform hover:bg-[#EFE4D2] active:scale-95"
        >
          {primaryActionLabel}
        </Link>
        <div className="mt-6 flex flex-col space-y-3">
          <Link
            href="/dashboard/help"
            className={
              pathname === "/dashboard/help"
                ? "flex items-center space-x-2 rounded-lg border border-[#E7D8C1] bg-[#F7F2E8] px-3 py-2 text-xs font-label uppercase text-[#352E2A]"
                : "flex items-center space-x-2 px-3 py-2 text-xs font-label uppercase text-[#352E2A] transition-colors hover:text-[#352E2A]"
            }
          >
            <span className="material-symbols-outlined text-sm">help</span>
            <span>帮助中心</span>
          </Link>
          <Link
            href="/dashboard/docs"
            className={
              pathname === "/dashboard/docs"
                ? "flex items-center space-x-2 rounded-lg border border-[#E7D8C1] bg-[#F7F2E8] px-3 py-2 text-xs font-label uppercase text-[#352E2A]"
                : "flex items-center space-x-2 px-3 py-2 text-xs font-label uppercase text-[#352E2A] transition-colors hover:text-[#352E2A]"
            }
          >
            <span className="material-symbols-outlined text-sm">description</span>
            <span>技术文档</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
