"use server";

import { encodedRedirect } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

function getTrimmedValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function countLines(text: string) {
  if (!text) {
    return 0;
  }

  return text.split(/\r\n|\r|\n/).length;
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "Please sign in before uploading logs.");
  }

  let lineCount = 0;

  try {
    const fileText = await file.text();
    lineCount = countLines(fileText);
  } catch {
    lineCount = 0;
  }

  const { error } = await supabase.from("logs").insert({
    user_id: user.id,
    file_name: file.name,
    file_type: file.type || "text/plain",
    source_type: sourceType,
    file_size: file.size,
    line_count: lineCount,
    analysis_mode: analysisMode,
    status: "uploaded",
  });

  if (error) {
    return encodedRedirect("error", "/dashboard", error.message);
  }

  return encodedRedirect("success", "/dashboard", `Uploaded ${file.name} successfully.`);
}
