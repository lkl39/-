"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { analyzeIncidents } from "@/lib/analysis/orchestrator";
import { resolveKnowledgeBaseContext } from "@/lib/analysis/rag";
import { getDynamicDetectionRules } from "@/lib/rules/db-rules";
import { detectLogIncidents } from "@/lib/rules/engine";
import { createClient } from "@/lib/supabase/server-client";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { encodedRedirect } from "@/lib/utils";

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

export async function createLogUploadAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard", "Supabase is not configured.");
  }

  const file = formData.get("logFile");
  const sourceType = getTrimmedValue(formData, "sourceType") || "custom";
  const analysisMode = "hybrid";

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

  const dynamicRules = await getDynamicDetectionRules();
  const incidents = detectLogIncidents(storedFileText, sourceType, dynamicRules);

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

    const analysesDraft = await analyzeIncidents(
      incidents.map((incident) => ({
        incident,
        sourceType,
        logContent: storedFileText,
      })),
      { resolveRagContext: resolveKnowledgeBaseContext },
    );

    const analyses = insertedIncidents.map((incidentRow, index) => {
      const draft = analysesDraft[index];

      return {
        log_error_id: incidentRow.id,
        log_id: logRecord.id,
        user_id: user.id,
        cause: draft.cause,
        risk_level: draft.riskLevel,
        confidence: draft.confidence,
        repair_suggestion: draft.repairSuggestion,
        rag_context:
          draft.ragContext.length > 0 ? JSON.stringify(draft.ragContext) : null,
        model_name: draft.modelName,
        analysis_mode: analysisMode,
        latency_ms: draft.latencyMs,
        tokens_used: draft.tokensUsed,
      };
    });

    const { error: analysisError } = await supabase
      .from("analysis_results")
      .insert(analyses);

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
    `Uploaded ${file.name} successfully. Rule engine detected ${incidents.length} candidate issues.`,
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
