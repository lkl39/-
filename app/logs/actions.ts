"use server";

import { randomUUID } from "node:crypto";
import { getDynamicDetectionRules } from "@/lib/rules/db-rules";
import { detectLogIncidents } from "@/lib/rules/engine";
import { encodedRedirect } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server-client";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

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
  const analysisMode = getTrimmedValue(formData, "analysisMode") || "hybrid";

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
    const { error: incidentsError } = await supabase.from("log_errors").insert(
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
    );

    if (incidentsError) {
      await supabase
        .from("logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", logRecord.id);

      return encodedRedirect("error", "/dashboard", incidentsError.message);
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
    "/dashboard",
    `Uploaded ${file.name} successfully. Rule engine detected ${incidents.length} candidate issues.`,
  );
}
