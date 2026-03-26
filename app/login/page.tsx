import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { LoginSessionReset } from "@/components/auth/login-session-reset";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server-client";

type LoginPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    clear?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const configured = hasSupabaseEnv();
  const shouldClearSession = params.clear === "1";

  if (configured) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#EBDEC6] text-[#352E2A]">
      <LoginSessionReset enabled={shouldClearSession} />
      <AuthNotice
        configured={configured}
        status={typeof params.status === "string" ? params.status : undefined}
        message={typeof params.message === "string" ? params.message : undefined}
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-[-5%] top-[-10%] h-[420px] w-[420px] rounded-full bg-[#8A5A2B]/20 blur-[120px]" />
        <div className="absolute bottom-[5%] right-[-5%] h-[460px] w-[460px] rounded-full bg-[#B07A47]/20 blur-[120px]" />
      </div>

      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/20 bg-white/10 px-8 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xl font-headline font-extrabold">
          <span className="material-symbols-outlined text-[#8A5A2B]">bolt</span>
          {"\u667a\u80fd\u65e5\u5fd7\u5206\u6790\u7cfb\u7edf"}
        </div>
        <Link href="/" className="text-sm text-[#6B625B] transition hover:text-[#352E2A]">
          {"\u8fd4\u56de\u9996\u9875"}
        </Link>
      </nav>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 pb-12 pt-24">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-[2rem] border border-white/30 p-10 shadow-[0_20px_60px_rgba(138,90,43,0.15)] md:p-12">
            <div className="mb-8 space-y-2">
              <h1 className="text-4xl font-headline font-extrabold tracking-tight">
                {"\u6b22\u8fce\u56de\u6765"}
              </h1>
              <p className="text-sm text-[#6B625B]">
                {"\u8fdb\u5165\u767b\u5f55\u9875\u65f6\u4f1a\u5148\u6e05\u6389\u5f53\u524d\u672c\u5730\u4f1a\u8bdd\uff0c\u53ea\u6709\u771f\u5b9e\u9a8c\u8bc1\u6210\u529f\u7684\u8d26\u53f7\u624d\u80fd\u8fdb\u5165\u7cfb\u7edf\u3002"}
              </p>
            </div>

            <form action={signInAction} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-label uppercase tracking-widest text-[#6B625B]">
                    {"\u90ae\u7bb1"}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6B625B]">person</span>
                    <input
                      name="email"
                      type="email"
                      className="w-full rounded-xl border border-transparent bg-[#EFE4D2] py-4 pl-12 pr-4 outline-none focus:border-[#8A5A2B]/40 focus:ring-0"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-xs font-label uppercase tracking-widest text-[#6B625B]">
                    {"\u5bc6\u7801"}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6B625B]">lock</span>
                    <input
                      name="password"
                      type="password"
                      className="w-full rounded-xl border border-transparent bg-[#EFE4D2] py-4 pl-12 pr-4 outline-none focus:border-[#8A5A2B]/40 focus:ring-0"
                      placeholder={"\u8bf7\u8f93\u5165\u767b\u5f55\u5bc6\u7801"}
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 font-headline font-bold text-black shadow-[0_12px_30px_rgba(255,255,255,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                {"\u7acb\u5373\u767b\u5f55"}
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-[#6B625B]">
              <Link href="/auth/reset-password" className="transition hover:text-[#8A5A2B]">
                {"\u5fd8\u8bb0\u5bc6\u7801"}
              </Link>
              <span className="mx-3">|</span>
              <Link href="/register" className="font-semibold transition hover:text-[#8A5A2B]">
                {"\u7acb\u5373\u6ce8\u518c"}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
