type ModeComparisonItem = {
  mode: string;
  detections: number;
  latency: string;
  calls: number;
  highlight?: boolean;
};

type ModeComparisonProps = {
  items: ModeComparisonItem[];
};

export function ModeComparison({ items }: ModeComparisonProps) {
  const maxDetections = Math.max(...items.map((item) => item.detections));

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.mode}
          className={`rounded-3xl border px-4 py-4 ${
            item.highlight
              ? "border-cyan-300/45 bg-cyan-300/8"
              : "border-white/8 bg-white/5"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-white">{item.mode}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {item.latency}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,_rgba(250,204,21,0.9),_rgba(34,211,238,0.92))]"
              style={{ width: `${(item.detections / maxDetections) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
            <span>异常数 {item.detections}</span>
            <span>模型调用 {item.calls}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
