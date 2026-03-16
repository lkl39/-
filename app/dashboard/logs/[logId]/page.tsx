import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LogDetail } from "@/components/dashboard/log-detail";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server-client";

type LogDetailPageProps = {
  params: Promise<{
    logId: string;
  }>;
};

export default async function LogDetailPage({ params }: LogDetailPageProps) {
  const profile = await getCurrentProfile();
  const { logId } = await params;

  if (!profile.userId) {
    notFound();
  }

  const supabase = await createClient();
  const { data: logRecord } = await supabase
    .from("logs")
    .select(
      "id, file_name, file_type, source_type, analysis_mode, status, storage_path, file_size, line_count, uploaded_at, completed_at",
    )
    .eq("id", logId)
    .eq("user_id", profile.userId)
    .maybeSingle();

  if (!logRecord) {
    notFound();
  }

  const [{ data: errors }, { data: analyses }] = await Promise.all([
    supabase
      .from("log_errors")
      .select("id, raw_text, error_type, detected_by, line_number, created_at")
      .eq("log_id", logId)
      .eq("user_id", profile.userId)
      .order("line_number", { ascending: true }),
    supabase
      .from("analysis_results")
      .select(
        "id, log_error_id, cause, risk_level, confidence, repair_suggestion, model_name, analysis_mode, created_at",
      )
      .eq("log_id", logId)
      .eq("user_id", profile.userId)
      .order("created_at", { ascending: false }),
  ]);

  const preview = await loadPreview(logRecord.storage_path, logRecord.file_size ?? 0);

  return (
    <DashboardShell
      userEmail={profile.userEmail ?? "unknown-user"}
      teamName={profile.teamName}
      activeView="logs"
    >
      <LogDetail
        log={{
          id: logRecord.id,
          fileName: logRecord.file_name,
          fileType: logRecord.file_type ?? "unknown",
          sourceType: logRecord.source_type ?? "unknown",
          analysisMode: logRecord.analysis_mode,
          status: logRecord.status,
          storagePath: logRecord.storage_path ?? "",
          fileSize: logRecord.file_size ?? 0,
          lineCount: logRecord.line_count ?? 0,
          uploadedAt: logRecord.uploaded_at ?? "",
          completedAt: logRecord.completed_at ?? null,
        }}
        errors={(errors ?? []).map((error) => ({
          id: error.id,
          rawText: error.raw_text,
          errorType: error.error_type ?? "unknown",
          detectedBy: error.detected_by ?? "rule",
          lineNumber: error.line_number ?? 0,
          createdAt: error.created_at ?? "",
        }))}
        analyses={(analyses ?? []).map((analysis) => ({
          id: analysis.id,
          logErrorId: analysis.log_error_id ?? null,
          cause: analysis.cause ?? "",
          riskLevel: analysis.risk_level ?? "medium",
          confidence:
            typeof analysis.confidence === "number"
              ? analysis.confidence
              : Number(analysis.confidence ?? 0),
          repairSuggestion: analysis.repair_suggestion ?? "",
          modelName: analysis.model_name ?? "rule-engine-v1",
          analysisMode: analysis.analysis_mode ?? "hybrid",
          createdAt: analysis.created_at ?? "",
        }))}
        preview={preview}
      />
    </DashboardShell>
  );
}

async function loadPreview(storagePath: string | null, fileSize: number) {
  if (!storagePath || fileSize > 1024 * 512) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { logBucket } = getSupabaseEnv();
    const { data } = await supabase.storage.from(logBucket).download(storagePath);

    if (!data) {
      return null;
    }

    const text = await data.text();
    const lines = text.split(/\r\n|\r|\n/);
    const previewLines = lines.slice(0, 40);

    return {
      text: previewLines.join("\n"),
      truncated: lines.length > previewLines.length,
    };
  } catch {
    return null;
  }
}

