import Link from "next/link";
import { submitReviewCaseAction } from "@/app/reviews/actions";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";

type ReviewItem = {
  id: string;
  logId: string;
  logName: string;
  rawText: string;
  errorType: string;
  detectedBy: string;
  lineNumber: number;
  createdAt: string;
  reviewStatus: string;
  issueSpot: string;
  resolution: string;
  updatedAt: string | null;
};

type ReviewsCenterProps = {
  status?: string;
  message?: string;
  filterLogId?: string;
  items: ReviewItem[];
};

export function ReviewsCenter({
  status,
  message,
  filterLogId,
  items,
}: ReviewsCenterProps) {
  const pendingCount = items.filter(
    (item) => item.reviewStatus !== "completed" && item.reviewStatus !== "skipped",
  ).length;
  const completedCount = items.filter(
    (item) => item.reviewStatus === "completed",
  ).length;
  const skippedCount = items.filter((item) => item.reviewStatus === "skipped").length;

  return (
    <>
      {message ? (
        <section className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_55px_rgba(2,8,18,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Review Status</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
            </div>
            <StatusPill
              label={status ?? "info"}
              tone={
                status === "error"
                  ? "danger"
                  : status === "success"
                    ? "success"
                    : "info"
              }
            />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Pending Review" value={`${pendingCount}`} tone="warning" />
        <SummaryCard label="Completed" value={`${completedCount}`} tone="success" />
        <SummaryCard label="Skipped" value={`${skippedCount}`} tone="neutral" />
      </section>

      <SectionCard
        eyebrow="Review"
        title="Manual Review Queue"
        description="Only fill two fields: where the issue happened and how it was resolved. If this incident is not worth keeping, skip it."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Current Scope</p>
            <p className="mt-1 text-sm text-slate-400">
              {filterLogId
                ? "Showing incidents for a single log task."
                : "Showing the latest incidents for your workspace."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
            >
              Back to Overview
            </Link>
            {filterLogId ? (
              <Link
                href={`/dashboard/logs/${filterLogId}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Open Log Detail
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {items.length === 0 ? (
            <EmptyState text="No incidents need manual review right now." />
          ) : (
            items.map((item) => (
              <form
                key={item.id}
                action={submitReviewCaseAction}
                className="rounded-[28px] border border-white/8 bg-white/5 p-5"
              >
                <input type="hidden" name="logErrorId" value={item.id} />
                <input
                  type="hidden"
                  name="returnPath"
                  value={
                    filterLogId
                      ? `/dashboard/reviews?logId=${encodeURIComponent(filterLogId)}`
                      : "/dashboard/reviews"
                  }
                />

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={item.errorType} tone="warning" />
                      <StatusPill label={item.reviewStatus} tone={getReviewTone(item.reviewStatus)} />
                      <StatusPill label={item.detectedBy} tone="info" />
                    </div>
                    <p className="font-mono text-sm leading-6 text-slate-200">
                      {item.rawText}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.logName} | line {item.lineNumber || "-"} |{" "}
                      {formatTimestamp(item.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/logs/${item.logId}`}
                    className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
                  >
                    View Log
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-200">
                      Issue Spot
                    </span>
                    <textarea
                      name="issueSpot"
                      defaultValue={item.issueSpot}
                      rows={4}
                      placeholder="Where did the problem happen? Example: postgres connection pool exhausted in billing service."
                      className="w-full rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-slate-200">
                      Resolution
                    </span>
                    <textarea
                      name="resolution"
                      defaultValue={item.resolution}
                      rows={4}
                      placeholder="How was it fixed? Example: increased pool size and restarted the service."
                      className="w-full rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {item.updatedAt
                      ? `Last updated ${formatTimestamp(item.updatedAt)}`
                      : "No manual review saved yet."}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      name="intent"
                      value="skip"
                      className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:bg-white/6"
                    >
                      Skip
                    </button>
                    <button
                      type="submit"
                      name="intent"
                      value="save"
                      className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                    >
                      Save Review
                    </button>
                  </div>
                </div>
              </form>
            ))
          )}
        </div>
      </SectionCard>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <div className="dashboard-panel rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_18px_55px_rgba(2,8,18,0.3)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
        </div>
        <StatusPill label={label} tone={tone} />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function getReviewTone(status: string) {
  if (status === "completed") {
    return "success";
  }

  if (status === "skipped") {
    return "neutral";
  }

  return "warning";
}

function formatTimestamp(value: string) {
  if (!value) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
