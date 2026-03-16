import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { StatusPill } from "@/components/dashboard/status-pill";

type DashboardShellProps = {
  userEmail: string;
  teamName: string | null;
  activeView: "overview" | "logs" | "rules" | "reviews" | "account";
  children: React.ReactNode;
};

const navItems = [
  { key: "overview", href: "/dashboard", label: "首页" },
  { key: "logs", href: "/dashboard/tasks", label: "数据管理中心" },
  { key: "reviews", href: "/dashboard/reviews", label: "审核与规则管理" },
  { key: "account", href: "/dashboard/account", label: "个人中心" },
] as const;

export function DashboardShell({
  userEmail,
  teamName,
  activeView,
  children,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_#07111f_0%,_#0b1728_55%,_#09131f_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8 lg:px-10">
        <section className="dashboard-panel rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_70px_rgba(3,9,20,0.32)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.95),_rgba(250,204,21,0.92))] text-sm font-bold text-slate-950">
                LA
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                  运维工作台
                </p>
                <h1 className="mt-1 text-xl font-semibold text-white">
                  智能日志分析控制台
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  当前账号：{userEmail}
                  {teamName ? ` | 团队：${teamName}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusPill label="Supabase 在线" tone="success" />
              <Link
                href="/"
                className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
              >
                返回登录页
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  退出登录
                </button>
              </form>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {navItems.map((item) => {
              const active = item.key === activeView;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/50 hover:bg-white/8"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
