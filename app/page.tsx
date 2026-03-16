import Link from "next/link";
import { SubmitButton } from "@/components/auth/submit-button";
import { StatusPill } from "@/components/dashboard/status-pill";
import { signInAction, signOutAction, signUpAction } from "@/app/auth/actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/profile";

type HomePageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    mode?: string;
  }>;
};

const quickStats = [
  { label: "实时日志流", value: "12.6M", detail: "今日进入分析链路的日志量" },
  { label: "高风险事件", value: "27", detail: "等待优先处理的异常事件" },
  { label: "混合模式命中", value: "91%", detail: "规则与模型协同的参考表现" },
];

export default async function Home({ searchParams }: HomePageProps) {
  const configured = hasSupabaseEnv();
  const params = await searchParams;
  const profile = configured ? await getCurrentProfile() : null;
  const userEmail = profile?.userEmail ?? null;
  const teamName = profile?.teamName ?? null;
  const mode = params.mode === "register" ? "register" : "login";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(34,211,238,0.16),_transparent_26%),radial-gradient(circle_at_85%_18%,_rgba(249,115,22,0.2),_transparent_24%),radial-gradient(circle_at_70%_80%,_rgba(236,72,153,0.14),_transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 md:px-8 lg:px-10">
        <header className="flex items-start justify-between rounded-[32px] border border-white/10 bg-white/6 px-5 py-4 shadow-[0_22px_70px_rgba(2,8,18,0.2)] backdrop-blur">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.95),_rgba(249,115,22,0.9))] text-sm font-bold text-slate-950">
                LA
              </div>
              <div>
                <p className="text-sm font-semibold text-white">智能日志分析平台</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-cyan-100">
              <StatusPill label="智能入口" tone="info" />
              <p className="text-base font-semibold tracking-[0.08em] text-cyan-50">
                欢迎使用智能日志分析平台
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userEmail ? (
              <span className="hidden rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100 md:inline-flex">
                已登录：{userEmail}
              </span>
            ) : null}
            <Link
              href="/dashboard"
              className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
            >
              进入仪表盘
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-6 py-4 lg:grid-cols-[1.05fr_0.95fr] lg:py-5">
          <div className="space-y-6">
            <div className="-mt-2 max-w-3xl space-y-5 lg:-mt-5">
              <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-black leading-[1.06] tracking-[-0.05em] text-white md:text-6xl xl:text-7xl">
                <span className="hero-line hero-line-primary block">日志可视，</span>
                <span className="hero-line hero-line-secondary mt-5 block">问题可溯，</span>
                <span className="hero-line hero-line-accent mt-5 block">
                  运维可控。
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300">
                从日志接入、异常识别到复核与决策，让分析链路更清晰，让运维动作更可追踪。
              </p>
            </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[28px] border border-white/10 bg-white/7 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)] backdrop-blur"
                >
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{item.value}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>

            {userEmail ? (
              <div className="rounded-[30px] border border-emerald-300/20 bg-emerald-300/10 p-5 shadow-[0_20px_60px_rgba(2,8,18,0.25)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">当前会话</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">已检测到登录会话</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      账号：{userEmail}
                      {teamName ? ` | 团队：${teamName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/dashboard"
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                    >
                      打开仪表盘
                    </Link>
                    <Link
                      href="/dashboard/account"
                      className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/50 hover:bg-white/6"
                    >
                      个人设置
                    </Link>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-rose-300/50 hover:bg-white/6"
                      >
                        退出登录
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <section className="rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-6 shadow-[0_24px_90px_rgba(1,6,18,0.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{mode === "login" ? "登录" : "注册"}</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    {mode === "login" ? "欢迎回来" : "创建账号"}
                  </h2>
                </div>
              </div>

              {mode === "login" ? (
                <form action={signInAction} className="mt-6 space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">工作邮箱</span>
                    <input
                      name="email"
                      type="email"
                      placeholder="ops@company.com"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">登录密码</span>
                    <input
                      name="password"
                      type="password"
                      placeholder="请输入密码"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                  </label>

                  <SubmitButton
                    idleText="登录"
                    pendingText="登录中..."
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.98),_rgba(249,115,22,0.95))] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      没有账号？{" "}
                      <Link href="/?mode=register" className="text-cyan-200 transition hover:text-cyan-100">
                        注册账号
                      </Link>
                    </span>
                    <Link href="/auth/reset-password" className="text-cyan-200 transition hover:text-cyan-100">
                      忘记密码？
                    </Link>
                  </div>
                </form>
              ) : (
                <form action={signUpAction} className="mt-6 space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">团队名称</span>
                    <input
                      name="teamName"
                      type="text"
                      placeholder="AIOps Team"
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-300/60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">邮箱</span>
                    <input
                      name="registerEmail"
                      type="email"
                      placeholder="owner@company.com"
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-300/60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">设置密码</span>
                    <input
                      name="registerPassword"
                      type="password"
                      placeholder="至少 8 位字符"
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-300/60"
                    />
                  </label>

                  <SubmitButton
                    idleText="创建账号"
                    pendingText="创建中..."
                    className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      已有账号？{" "}
                      <Link href="/?mode=login" className="text-cyan-200 transition hover:text-cyan-100">
                        去登录
                      </Link>
                    </span>
                    <Link href="/auth/reset-password" className="text-cyan-200 transition hover:text-cyan-100">
                      需要帮助？
                    </Link>
                  </div>
                </form>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}





