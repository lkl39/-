"use server";

import { revalidatePath } from "next/cache";
import { uploadAndAnalyzeLog } from "@/lib/logs/upload-service";
import { createClient } from "@/lib/supabase/server-client";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { encodedRedirect } from "@/lib/utils";

function getTrimmedValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

  try {
    const result = await uploadAndAnalyzeLog({
      supabase,
      user,
      file,
      sourceType,
      logBucket,
    });

    return encodedRedirect(
      "success",
      `/dashboard/analyses?logId=${result.logId}`,
      `Uploaded ${result.fileName} successfully. Mode: ${result.analysisMode}. Rule engine detected ${result.incidentsCount} candidate issues.`,
    );
  } catch (error) {
    return encodedRedirect(
      "error",
      "/dashboard",
      error instanceof Error ? error.message : "Log upload failed.",
    );
  }
}

export async function updateLogMetadataAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard/tasks", "Supabase is not configured.");
  }

  const logId = getTrimmedValue(formData, "logId");
  const fileName = getTrimmedValue(formData, "fileName");
  const sourceType = getTrimmedValue(formData, "sourceType") || "custom";

  if (!logId || !fileName) {
    return encodedRedirect("error", "/dashboard/tasks", "\u8bf7\u586b\u5199\u5b8c\u6574\u7684\u65e5\u5fd7\u4fe1\u606f\u3002");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ba1\u7406\u65e5\u5fd7\u3002");
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

  return encodedRedirect("success", "/dashboard/tasks", "\u65e5\u5fd7\u4fe1\u606f\u5df2\u66f4\u65b0\u3002");
}

export async function deleteLogAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard/tasks", "Supabase is not configured.");
  }

  const logId = getTrimmedValue(formData, "logId");
  const storagePath = getTrimmedValue(formData, "storagePath");

  if (!logId) {
    return encodedRedirect("error", "/dashboard/tasks", "\u672a\u627e\u5230\u8981\u5220\u9664\u7684\u65e5\u5fd7\u3002");
  }

  const { logBucket } = getSupabaseEnv();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ba1\u7406\u65e5\u5fd7\u3002");
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

  return encodedRedirect("success", "/dashboard/tasks", "\u65e5\u5fd7\u5df2\u5220\u9664\u3002");
}