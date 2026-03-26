import Link from "next/link";
import { requestPasswordResetAction, updatePasswordAction } from "@/app/auth/password-actions";
import { SubmitButton } from "@/components/auth/submit-button";
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
    <main className="min-h-screen bg-[#EBDEC6] px-5 py-8 text-[#352E2A] md:px-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] h-[420px] w-[420px] rounded-full bg-[#8A5A2B]/20 blur-[120px]"></div>
        <div className="absolute bottom-[5%] right-[-5%] h-[460px] w-[460px] rounded-full bg-[#B07A47]/20 blur-[120px]"></div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between rounded-full border border-white/30 bg-[#F7F2E8]/85 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-[#352E2A]">密码找回</p>
            <p className="text-xs text-[#6B625B]">
              先发送恢复邮件，再通过邮件中的恢复链接设置新密码。
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-[#D8C7AE] px-4 py-2 text-sm font-medium text-[#6B625B] transition hover:bg-white/40"
          >
            返回登录
          </Link>
        </div>

        {params.message ? (
          <div className="rounded-2xl border border-[#D8C7AE] bg-[#F7F2E8]/90 px-4 py-3 text-sm text-[#6B625B]">
            {params.message}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[32px] border border-white/30 bg-[#F7F2E8]/90 p-6 shadow-[0_20px_60px_rgba(138,90,43,0.15)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6B625B]">
              第一步
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#352E2A]">
              发送重置邮件
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6B625B]">
              输入账号邮箱，系统会向你的收件箱发送恢复链接。
            </p>

            <form action={requestPasswordResetAction} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#352E2A]">邮箱</span>
                <input
                  name="email"
                  type="email"
                  placeholder="ops@company.com"
                  className="w-full rounded-2xl border border-[#D8C7AE] bg-[#EFE4D2] px-4 py-3 text-sm text-[#352E2A] outline-none transition placeholder:text-[#9A8E81] focus:border-[#8A5A2B]/50"
                />
              </label>

              <SubmitButton
                idleText="发送恢复邮件"
                pendingText="发送中..."
                className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01]"
              />
            </form>
          </section>

          <section className="rounded-[32px] border border-white/30 bg-[#F7F2E8]/90 p-6 shadow-[0_20px_60px_rgba(138,90,43,0.15)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6B625B]">
              第二步
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#352E2A]">
              设置新密码
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6B625B]">
              请先打开邮箱中的恢复链接，再回到这里设置新密码。
            </p>

            {hasRecoverySession ? (
              <form action={updatePasswordAction} className="mt-6 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[#352E2A]">新密码</span>
                  <input
                    name="password"
                    type="password"
                    placeholder="至少 8 位字符"
                    className="w-full rounded-2xl border border-[#D8C7AE] bg-[#EFE4D2] px-4 py-3 text-sm text-[#352E2A] outline-none transition placeholder:text-[#9A8E81] focus:border-[#8A5A2B]/50"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[#352E2A]">确认密码</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    className="w-full rounded-2xl border border-[#D8C7AE] bg-[#EFE4D2] px-4 py-3 text-sm text-[#352E2A] outline-none transition placeholder:text-[#9A8E81] focus:border-[#8A5A2B]/50"
                  />
                </label>

                <SubmitButton
                  idleText="更新密码"
                  pendingText="更新中..."
                  className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01]"
                />
              </form>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-[#D8C7AE] bg-[#EFE4D2] px-4 py-8 text-sm leading-6 text-[#6B625B]">
                还没有检测到恢复会话，请先发送重置邮件，再通过邮箱中的恢复链接进入本页。
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
