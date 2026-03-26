import Link from 'next/link';
import { signUpAction } from '@/app/auth/actions';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#EBDEC6] text-[#352E2A] overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] h-[420px] w-[420px] rounded-full bg-[#8A5A2B]/20 blur-[120px]"></div>
        <div className="absolute bottom-[5%] right-[-5%] h-[460px] w-[460px] rounded-full bg-[#B07A47]/20 blur-[120px]"></div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="text-xl font-headline font-extrabold flex items-center gap-2">
          <span className="material-symbols-outlined text-[#8A5A2B]">bolt</span>
          智能日志分析系统
        </div>
        <Link href="/" className="text-sm text-[#6B625B] hover:text-[#352E2A] transition">返回首页</Link>
      </nav>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-[2rem] p-10 md:p-12 border border-white/30 shadow-[0_20px_60px_rgba(138,90,43,0.15)]">
            <div className="space-y-2 mb-8">
              <h1 className="text-4xl font-headline font-extrabold tracking-tight">创建账号</h1>
              <p className="text-sm text-[#6B625B]">注册后即可进入日志上传与分析流程</p>
            </div>

            <form action={signUpAction} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-label text-[#6B625B] ml-1">团队名称</label>
                  <input
                    name="teamName"
                    type="text"
                    className="w-full rounded-xl py-4 px-4 bg-[#EFE4D2] border border-transparent focus:border-[#8A5A2B]/40 focus:ring-0 outline-none"
                    placeholder="AIOps Team"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-label text-[#6B625B] ml-1">电子邮箱</label>
                  <input
                    name="registerEmail"
                    type="email"
                    className="w-full rounded-xl py-4 px-4 bg-[#EFE4D2] border border-transparent focus:border-[#8A5A2B]/40 focus:ring-0 outline-none"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-label text-[#6B625B] ml-1">密码</label>
                  <input
                    name="registerPassword"
                    type="password"
                    className="w-full rounded-xl py-4 px-4 bg-[#EFE4D2] border border-transparent focus:border-[#8A5A2B]/40 focus:ring-0 outline-none"
                    placeholder="至少 8 位字符"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-white text-black font-headline font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_12px_30px_rgba(255,255,255,0.4)]"
              >
                立即注册
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-[#6B625B]">
              已有账号？
              <Link href="/login" className="ml-2 font-semibold hover:text-[#8A5A2B] transition">去登录</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
