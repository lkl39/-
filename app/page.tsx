import Link from "next/link";
import { AuthNotice } from "@/components/auth/auth-notice";
import { SubmitButton } from "@/components/auth/submit-button";
import { StatusPill } from "@/components/dashboard/status-pill";
import { signInAction, signOutAction, signUpAction } from "@/app/auth/actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/profile";

const quickStats = [
  { label: "实时日志流", value: "12.6M", detail: "今日累计接入量" },
  { label: "高风险事件", value: "27", detail: "待优先处置" },
  { label: "混合模式命中", value: "91%", detail: "规则 + 模型协同" },
];

const signalCards = [
  {
    title: "Auth Gateway",
    value: "Ready",
    detail: "Supabase Auth 接口位已预留",
    tone: "success" as const,
  },
  {
    title: "Threat Feed",
    value: "312",
    detail: "异常事件进入待分析队列",
    tone: "warning" as const,
  },
  {
    title: "LLM Router",
    value: "Standby",
    detail: "模型供应商接入前的统一调度层",
    tone: "info" as const,
  },
];

const authHighlights = [
  "支持邮箱密码登录与团队邀请码注册",
  "后续直接接 Supabase Auth 与 Row Level Security",
  "预留 SSO / MFA / 审计日志入口，不影响当前前端结构",
];

type HomePageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const configured = hasSupabaseEnv();
  const params = await searchParams;
  const profile = configured ? await getCurrentProfile() : null;
  const userEmail = profile?.userEmail ?? null;
  const teamName = profile?.teamName ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(34,211,238,0.16),_transparent_26%),radial-gradient(circle_at_85%_18%,_rgba(249,115,22,0.2),_transparent_24%),radial-gradient(circle_at_70%_80%,_rgba(236,72,153,0.14),_transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="absolute left-[8%] top-[14%] h-44 w-44 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="absolute right-[10%] top-[10%] h-56 w-56 rounded-full bg-orange-400/12 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 md:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/6 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.95),_rgba(249,115,22,0.9))] text-sm font-bold text-slate-950">
              LA
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                智能日志分析与运维辅助决策系统
              </p>
              <p className="text-xs text-slate-400">
                Auth entry / dashboard access / future Supabase integration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userEmail ? (
              <span className="hidden rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100 md:inline-flex">
                当前登录：{userEmail}
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

        <section className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-100">
              <StatusPill label="Auth System" tone="info" />
              <span>Cool Frontend Prototype</span>
            </div>

            <div className="max-w-3xl space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                让登录页先有压迫感，
                <br />
                再让分析结果有说服力。
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300">
                这是系统的认证入口原型。视觉上偏运维监控台，结构上已经把登录、
                注册、团队接入、SSO 占位和仪表盘跳转都安排好，后续直接接
                Supabase Auth 即可。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {quickStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[28px] border border-white/10 bg-white/7 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)] backdrop-blur"
                >
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <AuthNotice
              configured={configured}
              status={params.status}
              message={params.message}
            />

            {userEmail ? (
              <div className="rounded-[30px] border border-emerald-300/20 bg-emerald-300/10 p-5 shadow-[0_20px_60px_rgba(2,8,18,0.25)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">
                      Active Session
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      已检测到当前登录会话
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      账号：{userEmail}
                      {teamName ? ` · 团队：${teamName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/dashboard"
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                    >
                      打开仪表盘
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

            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,18,36,0.92),rgba(12,25,43,0.8))] p-6 shadow-[0_24px_80px_rgba(2,8,18,0.38)]">
              <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.7),transparent)]" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">
                    Access Matrix
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    登录不是表单，是系统入口控制台。
                  </h2>
                </div>
                <StatusPill label="Supabase Ready" tone="success" />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-slate-950/45 p-5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.18),_transparent_58%)]" />
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                      <span>Cluster Access Topology</span>
                      <span>v0.1</span>
                    </div>
                    <div className="grid gap-3">
                      {[72, 46, 91, 63, 55, 84].map((width, index) => (
                        <div key={width} className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Node 0{index + 1}</span>
                            <span>{width}%</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,_rgba(34,211,238,0.95),_rgba(249,115,22,0.9))]"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {signalCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-[24px] border border-white/8 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {card.title}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-slate-400">
                            {card.detail}
                          </p>
                        </div>
                        <StatusPill label={card.value} tone={card.tone} />
                      </div>
                    </div>
                  ))}

                  <div className="rounded-[24px] border border-dashed border-white/12 bg-slate-950/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Auth Highlights
                    </p>
                    <div className="mt-3 space-y-2">
                      {authHighlights.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 top-4 h-[84%] w-[84%] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="relative space-y-5">
              <section className="rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-6 shadow-[0_24px_90px_rgba(1,6,18,0.45)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">
                      Login
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-white">
                      欢迎回来
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      登录后可进入日志分析仪表盘、查看异常队列和人工复核结果。
                    </p>
                  </div>
                  <StatusPill label="MFA Ready" tone="neutral" />
                </div>

                <form action={signInAction} className="mt-6 space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">
                      工作邮箱
                    </span>
                    <input
                      name="email"
                      type="email"
                      placeholder="ops@company.com"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">
                      登录密码
                    </span>
                    <input
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">
                      工作区
                    </span>
                    <input
                      name="workspace"
                      type="text"
                      placeholder="prod-cn-shanghai"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                  </label>

                  <div className="mt-6 grid gap-3">
                    <SubmitButton
                      idleText="登录控制台"
                      pendingText="正在登录..."
                      className="rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.98),_rgba(249,115,22,0.95))] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                    />
                    <button
                      type="button"
                      className="rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/45 hover:bg-white/8"
                    >
                      使用企业 SSO
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Supabase Auth / Magic Link / MFA 后续接入</span>
                    <Link
                      href="/dashboard"
                      className="text-cyan-200 transition hover:text-cyan-100"
                    >
                      直接预览系统
                    </Link>
                  </div>
                </form>
              </section>

              <section
                id="register"
                className="rounded-[34px] border border-white/10 bg-slate-950/45 p-6 shadow-[0_20px_70px_rgba(2,8,18,0.35)] backdrop-blur"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-orange-200/80">
                      Register
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      创建团队账号
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      当前只做前端形态，后续可直接绑定 Supabase 用户注册逻辑。
                    </p>
                  </div>
                  <StatusPill label="Invite Code" tone="warning" />
                </div>

                <form action={signUpAction} className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-200">
                        团队名称
                      </span>
                      <input
                        name="teamName"
                        type="text"
                        placeholder="AIOps Team"
                        className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-300/60"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-200">
                        联系邮箱
                      </span>
                      <input
                        name="registerEmail"
                        type="email"
                        placeholder="owner@company.com"
                        className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-300/60"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-200">
                        设置密码
                      </span>
                      <input
                        name="registerPassword"
                        type="password"
                        placeholder="At least 8 characters"
                        className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-300/60"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-200">
                        邀请码
                      </span>
                      <input
                        name="inviteCode"
                        type="text"
                        placeholder="OPS-2026-ACCESS"
                        className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-300/60"
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <SubmitButton
                      idleText="创建账户"
                      pendingText="正在创建..."
                      className="flex-1 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                    />
                    <button
                      type="button"
                      className="rounded-2xl border border-white/12 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-orange-300/50 hover:bg-white/6"
                    >
                      申请演示权限
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
