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
            <p className="text-sm font-semibold text-white">Password Recovery</p>
            <p className="text-xs text-slate-400">
              Request a recovery email or set a new password after opening the email link.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
          >
            Back to Login
          </Link>
        </div>

        <AuthNotice configured={configured} status={params.status} message={params.message} />

        <section className="grid gap-5 lg:grid-cols-2">
          <section className="dashboard-panel rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(3,9,20,0.32)]">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Step 1
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Send reset email
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter the account email. Supabase will send a recovery link to your inbox.
            </p>

            <form action={requestPasswordResetAction} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="ops@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                />
              </label>

              <SubmitButton
                idleText="Send Recovery Email"
                pendingText="Sending..."
                className="w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              />
            </form>
          </section>

          <section className="dashboard-panel rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_70px_rgba(3,9,20,0.32)]">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              Step 2
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Set new password
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open the recovery link from your email first. Then come back here to set the new password.
            </p>

            {hasRecoverySession ? (
              <form action={updatePasswordAction} className="mt-6 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">New Password</span>
                  <input
                    name="password"
                    type="password"
                    placeholder="At least 8 characters"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Confirm Password</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter the password"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <SubmitButton
                  idleText="Update Password"
                  pendingText="Updating..."
                  className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                />
              </form>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-sm leading-6 text-slate-400">
                No recovery session detected yet. Request the reset email first, then open the recovery link from your inbox.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
