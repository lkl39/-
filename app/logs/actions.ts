"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { analyzeIncidents } from "@/lib/analysis/orchestrator";
import type { IncidentAnalysisInput, NormalizedAnalysisResult } from "@/lib/analysis/types";
import { resolveKnowledgeBaseContext } from "@/lib/analysis/rag";
import { getDynamicDetectionRules } from "@/lib/rules/db-rules";
import { detectLogIncidents } from "@/lib/rules/engine";
import type { DetectedIncident } from "@/lib/rules/types";
import { createClient } from "@/lib/supabase/server-client";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { encodedRedirect } from "@/lib/utils";

const SHORT_FILE_BYTES = 1024;
const LONG_FILE_BYTES = 50 * 1024;
const SHORT_LINE_COUNT = 20;
const SHORT_INCIDENT_COUNT = 3;
const LONG_INCIDENT_COUNT = 20;
const HYBRID_MAX_GROUPS = 15;
const SUMMARIZED_MAX_GROUPS = 12;
const GROUP_NEARBY_LINE_WINDOW = 12;
const GROUP_SIMILARITY_THRESHOLD = 0.78;

type AnalysisMode = "rules_fast" | "hybrid" | "summarized_hybrid";

type IncidentGroup = {
  representativeIndex: number;
  memberIndices: number[];
  signature: string;
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
  const isShort = fileSize < SHORT_FILE_BYTES || lineCount <= SHORT_LINE_COUNT || incidentCount <= SHORT_INCIDENT_COUNT;
  if (isShort) {
    return "rules_fast";
  }

  const isLong = fileSize > LONG_FILE_BYTES || incidentCount > LONG_INCIDENT_COUNT;
  if (isLong) {
    return "summarized_hybrid";
  }

  return "hybrid";
}

function normalizeIncidentText(rawText: string) {
  return rawText
    .toLowerCase()
    .replace(/\b\d{4}-\d{2}-\d{2}[ t]\d{2}:\d{2}:\d{2}(?:[,.:]\d+)?\b/g, " ")
    .replace(/\b\d+(?:ms|s|m|h)?\b/g, " # ")
    .replace(/\b[0-9a-f]{8,}\b/g, " # ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeIncident(rawText: string) {
  return normalizeIncidentText(rawText)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function calculateTokenSimilarity(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const aSet = new Set(a);
  const bSet = new Set(b);
  let overlap = 0;

  for (const token of aSet) {
    if (bSet.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(aSet.size, bSet.size);
}

function shouldGroupIncidents(current: DetectedIncident, representative: DetectedIncident) {
  if (current.errorType !== representative.errorType) {
    return false;
  }

  const currentSignature = normalizeIncidentText(current.rawText);
  const representativeSignature = normalizeIncidentText(representative.rawText);

  if (!currentSignature || !representativeSignature) {
    return false;
  }

  if (currentSignature === representativeSignature) {
    return true;
  }

  const lineDistance = Math.abs(current.lineNumber - representative.lineNumber);
  const similarity = calculateTokenSimilarity(
    tokenizeIncident(current.rawText),
    tokenizeIncident(representative.rawText),
  );

  return lineDistance <= GROUP_NEARBY_LINE_WINDOW && similarity >= GROUP_SIMILARITY_THRESHOLD;
}

function createIncidentGroups(incidents: DetectedIncident[]) {
  const groups: IncidentGroup[] = [];

  incidents.forEach((incident, index) => {
    const existingGroup = groups.find((group) =>
      shouldGroupIncidents(incident, incidents[group.representativeIndex]),
    );

    if (existingGroup) {
      existingGroup.memberIndices.push(index);
      return;
    }

    groups.push({
      representativeIndex: index,
      memberIndices: [index],
      signature: normalizeIncidentText(incident.rawText),
    });
  });

  return groups;
}

function getRiskWeight(riskLevel: DetectedIncident["riskLevel"]) {
  if (riskLevel === "high") return 3;
  if (riskLevel === "medium") return 2;
  return 1;
}

function selectLlmGroupIndexes(groups: IncidentGroup[], incidents: DetectedIncident[], analysisMode: AnalysisMode) {
  if (analysisMode === "rules_fast") {
    return new Set<number>();
  }

  const maxGroups = analysisMode === "summarized_hybrid" ? SUMMARIZED_MAX_GROUPS : HYBRID_MAX_GROUPS;

  return new Set(
    groups
      .map((group, index) => ({
        index,
        score:
          group.memberIndices.length * 10 +
          getRiskWeight(incidents[group.representativeIndex].riskLevel) * 5 -
          incidents[group.representativeIndex].lineNumber / 10000,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxGroups)
      .map((item) => item.index),
  );
}

async function analyzeRepresentativeGroups(
  inputs: IncidentAnalysisInput[],
  llmIndexes: number[],
  ruleOnlyIndexes: number[],
) {
  const resultsByIndex = new Map<number, NormalizedAnalysisResult>();

  if (llmIndexes.length > 0) {
    const llmResults = await analyzeIncidents(
      llmIndexes.map((index) => inputs[index]),
      { resolveRagContext: resolveKnowledgeBaseContext },
    );

    llmIndexes.forEach((index, resultIndex) => {
      resultsByIndex.set(index, llmResults[resultIndex]);
    });
  }

  if (ruleOnlyIndexes.length > 0) {
    const ruleOnlyResults = await analyzeIncidents(
      ruleOnlyIndexes.map((index) => inputs[index]),
      { providerId: null, resolveRagContext: resolveKnowledgeBaseContext },
    );

    ruleOnlyIndexes.forEach((index, resultIndex) => {
      resultsByIndex.set(index, ruleOnlyResults[resultIndex]);
    });
  }

  return resultsByIndex;
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

    const groups = createIncidentGroups(incidents);
    const llmGroupIndexes = selectLlmGroupIndexes(groups, incidents, analysisMode);
    const representativeInputs = groups.map((group) => ({
      incident: incidents[group.representativeIndex],
      sourceType,
      logContent: storedFileText,
    }));

    const llmIndexes: number[] = [];
    const ruleOnlyIndexes: number[] = [];

    groups.forEach((_, index) => {
      if (llmGroupIndexes.has(index)) {
        llmIndexes.push(index);
      } else {
        ruleOnlyIndexes.push(index);
      }
    });

    const representativeResults = await analyzeRepresentativeGroups(
      representativeInputs,
      llmIndexes,
      ruleOnlyIndexes,
    );

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
