import Link from "next/link";
import { updateProfileAction } from "@/app/account/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { getCurrentProfile } from "@/lib/supabase/profile";

type DashboardAccountPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function DashboardAccountPage({
  searchParams,
}: DashboardAccountPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const tone =
    params.status === "error"
      ? "danger"
      : params.status === "success"
        ? "success"
        : "info";

  return (
    <DashboardShell
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      activeView="account"
    >
      {params.message ? (
        <section className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_55px_rgba(2,8,18,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">个人中心提示</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{params.message}</p>
            </div>
            <StatusPill
              label={params.status === "success" ? "成功" : params.status === "error" ? "失败" : "提示"}
              tone={tone}
            />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
        <SectionCard
          eyebrow="Profile"
          title="个人资料设置"
          description="这里维护会在系统内展示的基础资料。登录邮箱仍然由 Supabase Auth 统一管理。"
        >
          <form action={updateProfileAction} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">显示名称</span>
              <input
                name="displayName"
                type="text"
                defaultValue={profile.displayName ?? ""}
                placeholder="输入你的名称"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">团队名称</span>
              <input
                name="teamName"
                type="text"
                defaultValue={profile.teamName ?? ""}
                placeholder="输入团队名称"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </label>

            <div className="rounded-2xl bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">邮箱账号</p>
              <p className="mt-2 text-sm font-medium text-white">{profile.userEmail ?? "未知邮箱"}</p>
            </div>

            <SubmitButton
              idleText="保存资料"
              pendingText="保存中..."
              className="w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            />
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Security"
          title="密码与访问"
          description="如果忘记密码，或者希望主动重置密码，可以直接使用找回流程。"
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">重置密码</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                系统会先发送找回邮件，再进入安全的密码更新页面。
              </p>
              <Link
                href="/auth/reset-password"
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                打开重置页面
              </Link>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">当前登录状态</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                当前登录账号：{profile.userEmail ?? "未知账号"}。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
                >
                  返回首页
                </Link>
                <StatusPill label="账号正常" tone="success" />
              </div>
            </div>
          </div>
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
