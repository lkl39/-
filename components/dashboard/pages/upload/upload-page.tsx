"use client";

import { useMemo, useRef, useState } from "react";
import { createLogUploadAction } from "@/app/logs/actions";
import { SubmitButton } from "@/components/auth/submit-button";

function formatFileSize(size: number) {
  if (!size) return "0 KB";
  const mb = size / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.ceil(size / 1024))} KB`;
}

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const totalSizeText = useMemo(() => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(total);
  }, [files]);

  function syncFiles(nextFiles: File[]) {
    const selected = nextFiles.slice(0, 1);
    setFiles(selected);

    if (!inputRef.current) return;

    if (selected.length === 0) {
      inputRef.current.value = "";
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(selected[0]);
    inputRef.current.files = transfer.files;
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    syncFiles(Array.from(event.target.files ?? []));
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    syncFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function handleRemoveSelectedFile() {
    syncFiles([]);
  }

  return (
    <form action={createLogUploadAction} className="mx-auto w-full max-w-6xl">
      <input type="hidden" name="sourceType" value="custom" />

      <section className="mb-10">
        <h1 className="mb-4 font-headline text-4xl font-extrabold tracking-tight md:text-5xl">上传日志文件</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[#6B625B]">
          支持 `.log`、`.txt`、`.json`、`.csv` 等常见格式。提交后会直接走真实分析链路，并打开本次文件的分析详情。
        </p>
      </section>

      <div className="glass-panel rounded-3xl border border-white/30 p-1 shadow-[0_20px_60px_rgba(138,90,43,0.12)]">
        <div
          className={`flex min-h-[340px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed p-8 text-center transition-colors ${
            dragActive ? "border-[#8A5A2B]/60 bg-white/20" : "border-[#8A5A2B]/30"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#8A5A2B]/20 bg-[#EFE4D2]">
            <span className="material-symbols-outlined text-4xl text-[#8A5A2B]">cloud_upload</span>
          </div>
          <h3 className="mb-2 text-2xl font-bold text-[#352E2A]">点击或拖拽文件至此上传</h3>
          <p className="mb-8 text-xs uppercase tracking-widest text-[#6B625B]">Maximum file size: 500MB</p>

          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {[".LOG", ".TXT", ".JSON", ".CSV"].map((ext) => (
              <span
                key={ext}
                className="rounded-full border border-[#8A5A2B]/20 bg-[#EFE4D2] px-4 py-1.5 text-xs font-label text-[#6B625B]"
              >
                {ext}
              </span>
            ))}
          </div>

          <input
            ref={inputRef}
            id="file-upload"
            name="logFile"
            type="file"
            className="hidden"
            accept=".log,.txt,.json,.csv,.out,text/plain,application/json,text/csv"
            onChange={handleFilesSelected}
          />

          <label
            htmlFor="file-upload"
            className="inline-block cursor-pointer rounded-xl bg-[#8A5A2B] px-8 py-3 font-label font-bold text-white transition hover:bg-[#7A4A1B]"
          >
            选择文件
          </label>
        </div>
      </div>

      <section className="mt-6 space-y-3">
        <h4 className="px-1 text-xs font-label font-bold uppercase tracking-widest text-[#6B625B]">已选择的文件</h4>
        {files.length === 0 ? (
          <p className="px-1 py-3 text-sm text-[#6B625B]">暂无文件，请先上传日志后再开始分析。</p>
        ) : (
          files.map((file) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="glass-panel flex items-center gap-4 rounded-2xl border border-white/30 p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#8A5A2B]/20 bg-[#EFE4D2]">
                <span className="material-symbols-outlined text-[#8A5A2B]">description</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-[#352E2A]">{file.name}</span>
                  <span className="whitespace-nowrap text-xs text-[#6B625B]">{formatFileSize(file.size)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7D8C1]">
                  <div className="h-full w-full bg-[#8A5A2B]" />
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveSelectedFile}
                className="rounded-full p-2 text-[#6B625B] transition hover:bg-[#EFE4D2] hover:text-[#352E2A]"
                aria-label="移除已选文件"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          ))
        )}
      </section>

      <footer className="mt-10 flex flex-col items-start justify-end gap-4 md:flex-row md:items-center md:gap-6">
        <span className="flex items-center gap-2 text-sm text-[#6B625B]">
          <span className="material-symbols-outlined text-sm">info</span>
          分析完成后结果将自动保存至历史记录，当前文件总大小：{totalSizeText}
        </span>
        <SubmitButton
          idleText="上传并开始分析"
          pendingText="正在上传并生成分析结果..."
          className="flex items-center gap-3 rounded-xl bg-white px-8 py-4 font-extrabold text-black shadow-[0_10px_40px_rgba(255,255,255,0.25)] transition-all hover:scale-[1.02] active:scale-95"
        />
      </footer>
    </form>
  );
}
