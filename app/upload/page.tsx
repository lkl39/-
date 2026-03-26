'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { signOutAction } from '@/app/auth/actions';

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);

  const navItems = [
    { href: '/dashboard', icon: 'dashboard', label: '工作台' },
    { href: '/upload', icon: 'analytics', label: '日志分析' },
    { href: '/dashboard/tasks', icon: 'task', label: '任务列表' },
    { href: '/dashboard/incidents', icon: 'biotech', label: '问题处理' },
    { href: '/dashboard/analyses', icon: 'monitoring', label: '分析结果' },
    { href: '/dashboard/high-risk', icon: 'warning', label: '高风险' },
    { href: '/dashboard/reviews', icon: 'history_edu', label: '复核中心' },
    { href: '/dashboard/rules', icon: 'settings_suggest', label: '系统管理' },
    { href: '/dashboard/account', icon: 'person', label: '个人设置' },
  ];

  const totalSizeText = useMemo(() => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (!total) return '0 KB';
    const mb = total / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.ceil(total / 1024)} KB`;
  }, [files]);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
  };

  const handleStartAnalysis = () => {
    if (files.length === 0) return;
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#EBDEC6] text-[#352E2A]">
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col bg-[#B57743] shadow-[4px_0_24px_rgba(0,0,0,0.15)] z-[60] border-r border-white/10">
        <div className="py-8 px-6">
          <h1 className="font-headline font-black text-[#352E2A] text-xl tracking-tight">智能日志分析系统</h1>
          <p className="font-label text-[10px] uppercase tracking-widest text-[#352E2A]/50 mt-1">Luminous Obsidian AI</p>
        </div>
        <nav className="flex flex-col px-4 space-y-2 mt-2">
          {navItems.map((item) => {
            const active = item.href === '/upload';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'flex items-center space-x-3 px-4 py-3 rounded-xl bg-[#F7F2E8] text-[#352E2A] border-r-4 border-[#A8733A]'
                    : 'flex items-center space-x-3 px-4 py-3 rounded-xl text-[#352E2A] hover:bg-[#F7F2E8]/70 transition-all duration-200'
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label text-sm uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-6 py-8">
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#F7F2E8] text-[#352E2A] font-bold text-sm shadow hover:bg-[#EFE4D2] active:scale-95 transition-transform"
            >
              退出登录
            </button>
          </form>
        </div>
      </aside>

      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white/10 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#8A5A2B]">analytics</span>
          <span className="font-headline font-bold">工作台 · 日志分析</span>
        </div>
        <Link href="/" className="text-sm text-[#6B625B] hover:text-[#352E2A] transition">返回首页</Link>
      </header>

      <main className="pt-24 pb-12 px-8 md:pl-72 min-h-screen">
        <div className="max-w-6xl mx-auto w-full px-2 md:px-8">
          <section className="mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight mb-4">上传日志文件</h1>
            <p className="text-lg text-[#6B625B] max-w-2xl leading-relaxed">支持 .log, .txt, .json 等常见格式，系统将自动识别并分析。</p>
          </section>

          <div className="glass-panel rounded-3xl p-1 border border-white/30 shadow-[0_20px_60px_rgba(138,90,43,0.12)]">
            <div className="w-full min-h-[320px] border-2 border-dashed border-[#8A5A2B]/30 rounded-[22px] flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 w-20 h-20 rounded-2xl bg-[#EFE4D2] flex items-center justify-center border border-[#8A5A2B]/20">
                <span className="material-symbols-outlined text-4xl text-[#8A5A2B]">cloud_upload</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">点击或拖拽文件至此上传</h3>
              <p className="text-[#6B625B] text-xs uppercase tracking-widest mb-8">Maximum file size: 500MB</p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <span className="px-4 py-1.5 rounded-full bg-[#EFE4D2] border border-[#8A5A2B]/20 text-xs font-label text-[#6B625B]">.LOG</span>
                <span className="px-4 py-1.5 rounded-full bg-[#EFE4D2] border border-[#8A5A2B]/20 text-xs font-label text-[#6B625B]">.TXT</span>
                <span className="px-4 py-1.5 rounded-full bg-[#EFE4D2] border border-[#8A5A2B]/20 text-xs font-label text-[#6B625B]">.JSON</span>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".log,.txt,.json,.csv"
                id="file-upload"
                multiple
                onChange={handleFilesSelected}
              />
              <label
                htmlFor="file-upload"
                className="inline-block bg-[#8A5A2B] hover:bg-[#7A4A1B] text-white px-8 py-3 rounded-xl font-label font-bold cursor-pointer transition"
              >
                选择文件
              </label>
            </div>
          </div>

          <section className="mt-6 space-y-3">
            <h4 className="text-xs font-label font-bold tracking-widest uppercase text-[#6B625B] px-1">已选择的文件</h4>
            {files.length === 0 ? (
              <p className="text-sm text-[#6B625B] px-1 py-3">暂无文件，请上传日志后再开始分析。</p>
            ) : (
              files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="glass-panel rounded-2xl p-4 flex items-center gap-4 border border-white/30">
                  <div className="w-12 h-12 rounded-xl bg-[#EFE4D2] flex items-center justify-center border border-[#8A5A2B]/20">
                    <span className="material-symbols-outlined text-[#8A5A2B]">description</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1 gap-3">
                      <span className="font-medium truncate">{file.name}</span>
                      <span className="text-xs text-[#6B625B] whitespace-nowrap">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <div className="w-full bg-[#E7D8C1] h-1.5 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-[#8A5A2B]"></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <footer className="mt-10 flex flex-col md:flex-row justify-end items-start md:items-center gap-4 md:gap-6">
            <span className="text-sm text-[#6B625B] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">info</span>
              合计文件大小：{totalSizeText}
            </span>
            <button
              id="start-analysis-btn"
              onClick={handleStartAnalysis}
              disabled={files.length === 0}
              className="px-8 py-4 rounded-xl bg-white text-black font-extrabold flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_40px_rgba(255,255,255,0.25)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              开始分析
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
