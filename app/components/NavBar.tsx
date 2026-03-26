'use client';

import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-xl shadow-[0_32px_64px_rgba(255,255,255,0.06)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-black tracking-tighter text-[#352E2A] uppercase font-headline flex items-center hover:opacity-80 transition">
          <span className="material-symbols-outlined text-[#8A5A2B] mr-2" style={{ fontSize: '24px' }}>
            bolt
          </span>
          智能日志分析系统
        </Link>

        <div className="hidden md:flex items-center gap-8 font-label text-sm uppercase tracking-widest"></div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="bg-[#F7F2E8] hover:bg-[#EFE4D2] transition-all duration-300 px-6 py-2 rounded-lg font-label font-bold text-xs uppercase tracking-wider text-[#8A5A2B] border border-[#B07A47]/50 shadow-[0_6px_16px_rgba(138,90,43,0.18)] active:scale-95 inline-block"
          >
            登录/注册
          </Link>
        </div>
      </div>
    </nav>
  );
}
