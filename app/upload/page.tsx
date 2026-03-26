'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { signOutAction } from '@/app/auth/actions';
import { createLogUploadAction } from '@/app/logs/actions';
import { SubmitButton } from '@/components/auth/submit-button';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: '工作台' },
  { href: '/upload', icon: 'analytics', label: '日志分析' },
  { href: '/dashboard/tasks', icon: 'task', label: '任务列表' },
  { href: '/dashboard/incidents', icon: 'biotech', label: '问题处理' },
  { href: '/dashboard/analyses', icon: 'monitoring', label: '分析结果' },
  { href: '/dashboard/high-risk', icon: 'warning', label: '高风险' },
  { href: '/dashboard/reviews', icon: 'history_edu', label: '复核中心' },
  { href: '/dashboard/rules', icon: 'settings_suggest', label: '系统管理' },
  { href: '/dashboard/account', icon: 'person', label: '个人设置' },
] as const;

const SOURCE_TYPES = [
  { value: 'custom', label: '自定义日志' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'system', label: 'System' },
  { value: 'PostgreSQL', label: 'PostgreSQL' },
  { value: 'application', label: 'Application' },
] as const;

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);

  const totalSizeText = useMemo(() => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (!total) return '0 KB';
    const mb = total / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.ceil(total / 1024)} KB`;
  }, [files]);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).slice(0, 1);
    setFiles(selected);
  };

  return (
    <div className="min-h-screen bg-[#EBDEC6] text-[#352E2A]">
      <aside className="fixed left-0 top-0 z-[60] hidden h-screen w-64 flex-col border-r border-white/10 bg-[#B57743] shadow-[4px_0_24px_rgba(0,0,0,0.15)] md:flex">
        <div className="px-6 py-8">
          <h1 className="font-headline text-xl font-black tracking-tight text-[#352E2A]">
            智能日志分析系统
          </h1>
          <p className="mt-1 font-label text-[10px] uppercase tracking-widest text-[#352E2A]/50">
            Luminous Obsidian AI
          </p>
        </div>
        <nav className="mt-2 flex flex-col space-y-2 px-4">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/upload';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'flex items-center space-x-3 rounded-xl border-r-4 border-[#A8733A] bg-[#F7F2E8] px-4 py-3 text-[#352E2A]'
                    : 'flex items-center space-x-3 rounded-xl px-4 py-3 text-[#352E2A] transition-all duration-200 hover:bg-[#F7F2E8]/70'
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
              className="w-full rounded-xl bg-[#F7F2E8] py-3 text-sm font-bold text-[#352E2A] shadow transition-transform hover:bg-[#EFE4D2] active:scale-95"
            >
              退出登录
            </button>
          </form>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/20 bg-white/10 px-8 backdrop-blur-xl md:left-64">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#8A5A2B]">analytics</span>
          <span className="font-headline font-bold">工作台 · 日志分析</span>
        </div>
        <Link href="/" className="text-sm text-[#6B625B] transition hover:text-[#352E2A]">
          返回首页
        </Link>
      </header>

      <main className="min-h-screen px-8 pb-12 pt-24 md:pl-72">
        <form action={createLogUploadAction} className="mx-auto w-full max-w-6xl px-2 md:px-8">
          <section className="mb-10">
            <h1 className="mb-4 font-headline text-4xl font-extrabold tracking-tight md:text-5xl">
              上传日志文件
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-[#6B625B]">
              支持 .log、.txt、.json、.csv 等常见格式。提交后会直接走真实分析链路，并打开本次文件的分析详情。
            </p>
          </section>

          <div className="glass-panel rounded-3xl border border-white/30 p-1 shadow-[0_20px_60px_rgba(138,90,43,0.12)]">
            <div className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#8A5A2B]/30 p-8 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#8A5A2B]/20 bg-[#EFE4D2]">
                <span className="material-symbols-outlined text-4xl text-[#8A5A2B]">cloud_upload</span>
              </div>
              <h3 className="mb-2 text-2xl font-bold">点击选择日志文件并开始分析</h3>
              <p className="mb-8 text-xs uppercase tracking-widest text-[#6B625B]">
                Maximum file size: 500MB
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                <span className="rounded-full border border-[#8A5A2B]/20 bg-[#EFE4D2] px-4 py-1.5 text-xs font-label text-[#6B625B]">
                  .LOG
                </span>
                <span className="rounded-full border border-[#8A5A2B]/20 bg-[#EFE4D2] px-4 py-1.5 text-xs font-label text-[#6B625B]">
                  .TXT
                </span>
                <span className="rounded-full border border-[#8A5A2B]/20 bg-[#EFE4D2] px-4 py-1.5 text-xs font-label text-[#6B625B]">
                  .JSON
                </span>
                <span className="rounded-full border border-[#8A5A2B]/20 bg-[#EFE4D2] px-4 py-1.5 text-xs font-label text-[#6B625B]">
                  .CSV
                </span>
              </div>
              <input
                id="file-upload"
                name="logFile"
                type="file"
                className="hidden"
                accept=".log,.txt,.json,.csv,.out,text/plain,application/json"
                onChange={handleFilesSelected}
              />
              <label
                htmlFor="file-upload"
                className="inline-block cursor-pointer rounded-xl bg-[#8A5A2B] px-8 py-3 font-label font-bold text-white transition hover:bg-[#7A4A1B]"
              >
                选择文件
              </label>

              <label className="mt-6 w-full max-w-xs text-left">
                <span className="mb-2 block text-xs font-label font-bold uppercase tracking-widest text-[#6B625B]">
                  日志来源
                </span>
                <select
                  name="sourceType"
                  defaultValue="custom"
                  className="w-full rounded-xl border border-[#8A5A2B]/20 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8A5A2B]"
                >
                  {SOURCE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <section className="mt-6 space-y-3">
            <h4 className="px-1 text-xs font-label font-bold uppercase tracking-widest text-[#6B625B]">
              已选择的文件
            </h4>
            {files.length === 0 ? (
              <p className="px-1 py-3 text-sm text-[#6B625B]">暂未选择文件，请先上传日志后再开始分析。</p>
            ) : (
              files.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="glass-panel flex items-center gap-4 rounded-2xl border border-white/30 p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#8A5A2B]/20 bg-[#EFE4D2]">
                    <span className="material-symbols-outlined text-[#8A5A2B]">description</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="whitespace-nowrap text-xs text-[#6B625B]">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7D8C1]">
                      <div className="h-full w-full bg-[#8A5A2B]"></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <footer className="mt-10 flex flex-col items-start justify-end gap-4 md:flex-row md:items-center md:gap-6">
            <span className="flex items-center gap-2 text-sm text-[#6B625B]">
              <span className="material-symbols-outlined text-sm">info</span>
              合计文件大小：{totalSizeText}
            </span>
            <SubmitButton
              idleText="上传并开始分析"
              pendingText="正在上传并生成分析结果..."
              className="flex items-center gap-3 rounded-xl bg-white px-8 py-4 font-extrabold text-black shadow-[0_10px_40px_rgba(255,255,255,0.25)] transition-all hover:scale-[1.02] active:scale-95"
            />
          </footer>
        </form>
      </main>
    </div>
  );
}
