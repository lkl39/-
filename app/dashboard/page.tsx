import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

type DashboardPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: recentLogs } = profile.userId
    ? await supabase
        .from("logs")
        .select(
          "id, file_name, source_type, analysis_mode, status, file_size, line_count, uploaded_at",
        )
        .eq("user_id", profile.userId)
        .order("uploaded_at", { ascending: false })
        .limit(6)
    : { data: [] };

  return (
    <DashboardHome
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      status={params.status}
      message={params.message}
      recentLogs={(recentLogs ?? []).map((log) => ({
        id: log.id,
        fileName: log.file_name,
        sourceType: log.source_type ?? "unknown",
        analysisMode: log.analysis_mode,
        status: log.status,
        fileSize: log.file_size ?? 0,
        lineCount: log.line_count ?? 0,
        uploadedAt: log.uploaded_at ?? "",
      }))}
    />
  );
}
