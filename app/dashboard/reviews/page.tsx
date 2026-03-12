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

export default async function DashboardReviewsPage({
  searchParams,
}: DashboardReviewsPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const userId = profile.userId;
  const filterLogId = params.logId?.trim() || undefined;

  const [errorsResult, reviewsResult] = userId
    ? await Promise.all([
        (() => {
          let query = supabase
            .from("log_errors")
            .select(
              "id, log_id, raw_text, error_type, detected_by, line_number, created_at",
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30);

          if (filterLogId) {
            query = query.eq("log_id", filterLogId);
          }

          return query;
        })(),
        (() => {
          let query = supabase
            .from("review_cases")
            .select(
              "id, log_error_id, log_id, final_cause, resolution, review_status, updated_at",
            )
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(30);

          if (filterLogId) {
            query = query.eq("log_id", filterLogId);
          }

          return query;
        })(),
      ])
    : [{ data: [] }, { data: [] }];

  const logIds = Array.from(
    new Set((errorsResult.data ?? []).map((item) => item.log_id).filter(Boolean)),
  );

  const logsResult =
    userId && logIds.length > 0
      ? await supabase
          .from("logs")
          .select("id, file_name")
          .eq("user_id", userId)
          .in("id", logIds)
      : { data: [] };

  const logNameById = new Map(
    (logsResult.data ?? []).map((item) => [item.id, item.file_name ?? "Unknown log"]),
  );
  const reviewByErrorId = new Map(
    (reviewsResult.data ?? [])
      .filter((item) => item.log_error_id)
      .map((item) => [item.log_error_id as string, item]),
  );

  const reviewItems = (errorsResult.data ?? []).map((error) => {
    const review = reviewByErrorId.get(error.id);

    return {
      id: error.id,
      logId: error.log_id ?? "",
      logName: logNameById.get(error.log_id ?? "") ?? "Unknown log",
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
        items={reviewItems}
      />
    </DashboardShell>
  );
}
