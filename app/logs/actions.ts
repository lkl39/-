"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  analyzeRepresentativeGroups,
  buildRepresentativeAnalysisPlan,
  buildReviewDecisions,
  createDualCheckReviewRows,
  type AnalysisMode,
} from "@/lib/analysis/orchestrator";
import { resolveKnowledgeBaseContext } from "@/lib/analysis/rag";
import { getDynamicDetectionRules } from "@/lib/rules/db-rules";
import { detectLogIncidents } from "@/lib/rules/engine";
import { createClient } from "@/lib/supabase/server-client";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { encodedRedirect } from "@/lib/utils";

const SHORT_FILE_BYTES = 1024;
const LONG_FILE_BYTES = 50 * 1024;
const SHORT_LINE_COUNT = 20;
const SHORT_INCIDENT_COUNT = 3;
const LONG_INCIDENT_COUNT = 20;

type PendingReviewRow = {
  log_error_id: string;
  log_id: string;
  user_id: string;
  final_error_type: string | null;
  final_risk_level: string | null;
  review_status: string;
  review_note: string | null;
};

function getTrimmedValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function countLines(text: string) {
  if (!text) {
    return 0;
  }

  return text.split(/\r\n|\r|\n/).length;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function createStoragePath(userId: string, fileName: string) {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${userId}/${year}/${month}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

function resolveAnalysisMode(fileSize: number, lineCount: number, incidentCount: number): AnalysisMode {
  const isShort =
    fileSize < SHORT_FILE_BYTES ||
    lineCount <= SHORT_LINE_COUNT ||
    incidentCount <= SHORT_INCIDENT_COUNT;

  if (isShort) {
    return "rules_fast";
  }

  const isLong = fileSize > LONG_FILE_BYTES || incidentCount > LONG_INCIDENT_COUNT;
  if (isLong) {
    return "summarized_hybrid";
  }

  return "hybrid";
}

function mergeReviewRows(
  baseRows: PendingReviewRow[],
  extraRows: PendingReviewRow[],
): PendingReviewRow[] {
  const rowsByErrorId = new Map<string, PendingReviewRow>();

  for (const row of baseRows) {
    rowsByErrorId.set(row.log_error_id, row);
  }

  for (const row of extraRows) {
    const existing = rowsByErrorId.get(row.log_error_id);

    if (!existing) {
      rowsByErrorId.set(row.log_error_id, row);
      continue;
    }

    rowsByErrorId.set(row.log_error_id, {
      ...existing,
      final_error_type: row.final_error_type ?? existing.final_error_type,
      final_risk_level: row.final_risk_level ?? existing.final_risk_level,
      review_status: row.review_status || existing.review_status,
      review_note: [existing.review_note, row.review_note].filter(Boolean).join(" | ") || null,
    });
  }

  return Array.from(rowsByErrorId.values());
}

export async function createLogUploadAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard", "Supabase is not configured.");
  }

  const file = formData.get("logFile");
  const sourceType = getTrimmedValue(formData, "sourceType") || "custom";

  if (!(file instanceof File) || file.size === 0) {
    return encodedRedirect("error", "/dashboard", "Please choose a log file first.");
  }

  const { logBucket } = getSupabaseEnv();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "Please sign in before uploading logs.");
  }

  let fileText = "";

  try {
    fileText = await file.text();
  } catch {
    return encodedRedirect("error", "/dashboard", "Failed to read the uploaded file.");
  }

  const lineCount = countLines(fileText);
  const storagePath = createStoragePath(user.id, file.name);

  const { error: uploadError } = await supabase.storage
    .from(logBucket)
    .upload(storagePath, file, {
      contentType: file.type || "text/plain",
      upsert: false,
    });

  if (uploadError) {
    const uploadMessage =
      uploadError.message.includes("Bucket not found")
        ? `Storage bucket "${logBucket}" was not found. Create it in Supabase Storage first.`
        : uploadError.message;

    return encodedRedirect("error", "/dashboard", uploadMessage);
  }

  const { data: storedFile, error: downloadError } = await supabase.storage
    .from(logBucket)
    .download(storagePath);

  if (downloadError || !storedFile) {
    return encodedRedirect(
      "error",
      "/dashboard",
      downloadError?.message ?? "Stored file could not be downloaded for analysis.",
    );
  }

  const storedFileText = await storedFile.text();
  const dynamicRules = await getDynamicDetectionRules();
  const incidents = detectLogIncidents(storedFileText, sourceType, dynamicRules);
  const analysisMode = resolveAnalysisMode(file.size, lineCount, incidents.length);

  const { data: logRecord, error } = await supabase
    .from("logs")
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_type: file.type || "text/plain",
      source_type: sourceType,
      storage_path: storagePath,
      file_size: file.size,
      line_count: lineCount,
      analysis_mode: analysisMode,
      status: "processing",
    })
    .select("id")
    .single();

  if (error || !logRecord) {
    return encodedRedirect("error", "/dashboard", error?.message ?? "Failed to create log record.");
  }

  if (incidents.length > 0) {
    const { data: insertedIncidents, error: incidentsError } = await supabase
      .from("log_errors")
      .insert(
        incidents.map((incident) => ({
          log_id: logRecord.id,
          user_id: user.id,
          raw_text: incident.rawText,
          error_type: incident.errorType,
          detected_by: "rule",
          line_number: incident.lineNumber,
          is_uncertain: false,
          review_status: "pending",
        })),
      )
      .select("id, raw_text, error_type, line_number");

    if (incidentsError || !insertedIncidents) {
      await supabase
        .from("logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", logRecord.id);

      return encodedRedirect(
        "error",
        `/dashboard/logs/${logRecord.id}`,
        incidentsError?.message ?? "Failed to write detected incidents.",
      );
    }

    const { groups, representativeInputs, llmIndexes, ruleOnlyIndexes } =
      buildRepresentativeAnalysisPlan({
        incidents,
        sourceType,
        logContent: storedFileText,
        analysisMode,
      });

    const representativeResults = await analyzeRepresentativeGroups({
      inputs: representativeInputs,
      llmIndexes,
      ruleOnlyIndexes,
      resolveRagContext: resolveKnowledgeBaseContext,
    });

    const reviewDecisionRows = buildReviewDecisions({
      groups,
      incidents,
      insertedIncidents,
      representativeResults,
      userId: user.id,
      logId: logRecord.id,
    })
      .filter((item) => item.decision.needsReview)
      .map((item) => ({
        log_error_id: item.logErrorId,
        log_id: item.logId,
        user_id: item.userId,
        final_error_type: item.decision.finalErrorType,
        final_risk_level: item.decision.finalRiskLevel,
        review_status: item.decision.reviewStatus,
        review_note: item.decision.reviewNote,
      } satisfies PendingReviewRow));

    const dualCheckReviews = (await createDualCheckReviewRows({
      groups,
      incidents,
      insertedIncidents,
      representativeInputs,
      representativeResults,
      ruleOnlyIndexes,
      userId: user.id,
      logId: logRecord.id,
      resolveRagContext: resolveKnowledgeBaseContext,
    })) as PendingReviewRow[];

    const analyses = groups.flatMap((group, groupIndex) => {
      const result = representativeResults.get(groupIndex);
      if (!result) {
        return [];
      }

      return group.memberIndices.map((memberIndex) => ({
        log_error_id: insertedIncidents[memberIndex].id,
        log_id: logRecord.id,
        user_id: user.id,
        cause: result.cause,
        risk_level: result.riskLevel,
        confidence: result.confidence,
        repair_suggestion: result.repairSuggestion,
        rag_context: result.ragContext.length > 0 ? JSON.stringify(result.ragContext) : null,
        model_name: result.modelName,
        analysis_mode: analysisMode,
        latency_ms: result.latencyMs,
        tokens_used: result.tokensUsed,
      }));
    });

    const { error: analysisError } = await supabase.from("analysis_results").insert(analyses);

    if (analysisError) {
      await supabase
        .from("logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", logRecord.id);

      return encodedRedirect("error", "/dashboard", analysisError.message);
    }

    const reviewRows = mergeReviewRows(reviewDecisionRows, dualCheckReviews);

    if (reviewRows.length > 0) {
      const { error: reviewInsertError } = await supabase.from("review_cases").insert(reviewRows);

      if (reviewInsertError) {
        console.error("Failed to insert review cases:", reviewInsertError.message);
      }
    }
  }

  const { error: updateError } = await supabase
    .from("logs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", logRecord.id);

  if (updateError) {
    return encodedRedirect("error", "/dashboard", updateError.message);
  }

  return encodedRedirect(
    "success",
    `/dashboard/logs/${logRecord.id}`,
    `Uploaded ${file.name} successfully. Mode: ${analysisMode}. Rule engine detected ${incidents.length} candidate issues.`,
  );
}

export async function updateLogMetadataAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard/tasks", "Supabase is not configured.");
  }

  const logId = getTrimmedValue(formData, "logId");
  const fileName = getTrimmedValue(formData, "fileName");
  const sourceType = getTrimmedValue(formData, "sourceType") || "custom";

  if (!logId || !fileName) {
    return encodedRedirect("error", "/dashboard/tasks", "请填写完整的日志信息。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "请先登录后再管理日志。");
  }

  const { error } = await supabase
    .from("logs")
    .update({
      file_name: fileName,
      source_type: sourceType,
    })
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    return encodedRedirect("error", "/dashboard/tasks", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath(`/dashboard/logs/${logId}`);

  return encodedRedirect("success", "/dashboard/tasks", "日志信息已更新。");
}

export async function deleteLogAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard/tasks", "Supabase is not configured.");
  }

  const logId = getTrimmedValue(formData, "logId");
  const storagePath = getTrimmedValue(formData, "storagePath");

  if (!logId) {
    return encodedRedirect("error", "/dashboard/tasks", "未找到要删除的日志。");
  }

  const { logBucket } = getSupabaseEnv();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "请先登录后再管理日志。");
  }

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(logBucket)
      .remove([storagePath]);

    if (storageError) {
      return encodedRedirect("error", "/dashboard/tasks", storageError.message);
    }
  }

  const { error } = await supabase
    .from("logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    return encodedRedirect("error", "/dashboard/tasks", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/incidents");
  revalidatePath("/dashboard/high-risk");
  revalidatePath("/dashboard/analyses");

  return encodedRedirect("success", "/dashboard/tasks", "日志已删除。");
}
