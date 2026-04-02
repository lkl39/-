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
    return encodedRedirect("error", "/upload", "请先配置 Supabase 环境变量。");
  }

  const file = formData.get("logFile");
  const sourceType = getTrimmedValue(formData, "sourceType") || "custom";

  if (!(file instanceof File) || file.size === 0) {
    return encodedRedirect("error", "/upload", "请先选择日志文件。");
  }

  const { logBucket } = getSupabaseEnv();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/login", "请先登录后再上传日志。");
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
      `已成功上传 ${result.fileName}，识别到 ${result.incidentsCount} 个候选问题。`,
    );
  } catch (error) {
    return encodedRedirect(
      "error",
      "/upload",
      error instanceof Error ? error.message : "日志上传失败，请稍后重试。",
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
