import Link from "next/link";
import { requestPasswordResetAction, updatePasswordAction } from "@/app/auth/password-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { AuthNotice } from "@/components/auth/auth-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/profile";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const configured = hasSupabaseEnv();
  const params = await searchParams;
  const profile = configured ? await getCurrentProfile() : null;
  const hasRecoverySession = Boolean(profile?.userId);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28%),linear-gradient(180deg,_#07111f_0%,_#0b1728_55%,_#09131f_100%)] px-5 py-8 text-slate-100 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/6 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-white">密码找回</p>
            <p className="text-xs text-slate-400">
              先发送恢复邮件，再通过邮件中的恢复链接设置新密码。
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
          >
            返回登录
          </Link>
        </div>

        <AuthNotice configured={configured} status={params.status} message={params.message} />

        <section className="grid gap-5 lg:grid-cols-2">
          <section className="dashboard-panel rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(3,9,20,0.32)]">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              第一步
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              发送重置邮件
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              输入账号邮箱，系统会向你的收件箱发送恢复链接。
            </p>

            <form action={requestPasswordResetAction} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">邮箱</span>
                <input
                  name="email"
                  type="email"
                  placeholder="ops@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                />
              </label>

              <SubmitButton
                idleText="发送恢复邮件"
                pendingText="发送中..."
                className="w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              />
            </form>
          </section>

          <section className="dashboard-panel rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(3,9,20,0.32)]">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              第二步
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              设置新密码
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              请先打开邮箱中的恢复链接，再回到这里设置新密码。
            </p>

            {hasRecoverySession ? (
              <form action={updatePasswordAction} className="mt-6 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">新密码</span>
                  <input
                    name="password"
                    type="password"
                    placeholder="至少 8 位字符"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">确认密码</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <SubmitButton
                  idleText="更新密码"
                  pendingText="更新中..."
                  className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                />
              </form>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-sm leading-6 text-slate-400">
                还没有检测到恢复会话，请先发送重置邮件，再通过邮箱中的恢复链接进入本页。
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
