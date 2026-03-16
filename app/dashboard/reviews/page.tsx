import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ReviewsCenter } from "@/components/dashboard/reviews-center";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

type DashboardReviewsPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    logId?: string;
  }>;
};

export default async function DashboardReviewsPage({ searchParams }: DashboardReviewsPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const userId = profile.userId;
  const filterLogId = params.logId?.trim() || undefined;

  const [errorsResult, reviewsResult, dynamicRulesResult] = userId
    ? await Promise.all([
        (() => {
          let query = supabase
            .from("log_errors")
            .select("id, log_id, raw_text, error_type, detected_by, line_number, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(120);

          if (filterLogId) {
            query = query.eq("log_id", filterLogId);
          }

          return query;
        })(),
        (() => {
          let query = supabase
            .from("review_cases")
            .select("id, log_error_id, log_id, final_cause, resolution, review_status, updated_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(120);

          if (filterLogId) {
            query = query.eq("log_id", filterLogId);
          }

          return query;
        })(),
        supabase
          .from("detection_rules")
          .select("id, name, error_type, risk_level, enabled, updated_at")
          .order("updated_at", { ascending: false })
          .limit(12),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const errors = errorsResult.data ?? [];
  const logIds = Array.from(new Set(errors.map((item) => item.log_id).filter(Boolean)));

  const logsResult =
    userId && logIds.length > 0
      ? await supabase
          .from("logs")
          .select("id, file_name, source_type, uploaded_at")
          .eq("user_id", userId)
          .in("id", logIds)
      : { data: [] };

  const logsById = new Map(
    (logsResult.data ?? []).map((item) => [
      item.id,
      {
        fileName: item.file_name ?? "未知日志",
        sourceType: item.source_type ?? "custom",
        uploadedAt: item.uploaded_at ?? "",
      },
    ]),
  );

  const reviewByErrorId = new Map(
    (reviewsResult.data ?? [])
      .filter((item) => item.log_error_id)
      .map((item) => [item.log_error_id as string, item]),
  );

  const reviewItems = errors.map((error) => {
    const review = reviewByErrorId.get(error.id);
    const logInfo = logsById.get(error.log_id ?? "");

    return {
      id: error.id,
      logId: error.log_id ?? "",
      logName: logInfo?.fileName ?? "未知日志",
      rawText: error.raw_text,
      errorType: error.error_type ?? "unknown",
      detectedBy: error.detected_by ?? "rule",
      lineNumber: error.line_number ?? 0,
      createdAt: error.created_at ?? "",
      reviewStatus: review?.review_status ?? "pending",
      issueSpot: review?.final_cause ?? "",
      resolution: review?.resolution ?? "",
      updatedAt: review?.updated_at ?? null,
    };
  });

  const logGroups = Array.from(
    reviewItems.reduce((map, item) => {
      const existing = map.get(item.logId) ?? {
        logId: item.logId,
        logName: item.logName,
        total: 0,
        pending: 0,
        completed: 0,
        latestAt: item.createdAt,
      };

      existing.total += 1;
      if (item.reviewStatus === "completed") {
        existing.completed += 1;
      } else {
        existing.pending += 1;
      }
      if (item.createdAt > existing.latestAt) {
        existing.latestAt = item.createdAt;
      }

      map.set(item.logId, existing);
      return map;
    }, new Map<string, {
      logId: string;
      logName: string;
      total: number;
      pending: number;
      completed: number;
      latestAt: string;
    }>()).values(),
  ).sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1));

  const currentLog = filterLogId ? logsById.get(filterLogId) : null;
  const dynamicRules = dynamicRulesResult.data ?? [];

  return (
    <DashboardShell
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      activeView="reviews"
    >
      <ReviewsCenter
        status={params.status}
        message={params.message}
        filterLogId={filterLogId}
        currentLogName={currentLog?.fileName ?? null}
        logGroups={logGroups}
        items={reviewItems}
        ruleSummary={{
          total: dynamicRules.length,
          enabled: dynamicRules.filter((rule) => rule.enabled ?? true).length,
          recentRules: dynamicRules.slice(0, 6).map((rule) => ({
            id: rule.id,
            name: rule.name,
            errorType: rule.error_type ?? "unknown",
            riskLevel: rule.risk_level ?? "medium",
            updatedAt: rule.updated_at ?? "",
          })),
        }}
      />
    </DashboardShell>
  );
}
