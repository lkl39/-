const toneClasses = {
  success: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/25",
  warning: "bg-amber-300/15 text-amber-100 ring-1 ring-amber-300/25",
  danger: "bg-rose-400/15 text-rose-100 ring-1 ring-rose-400/25",
  info: "bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-300/25",
  neutral: "bg-white/8 text-slate-200 ring-1 ring-white/10",
} as const;

type StatusPillProps = {
  label: string;
  tone: keyof typeof toneClasses;
};

export function StatusPill({ label, tone }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
