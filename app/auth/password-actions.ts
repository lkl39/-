"use server";

import { encodedRedirect } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server-client";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

function getTrimmedValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function requestPasswordResetAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/auth/reset-password", "Supabase is not configured.");
  }

  const email = getTrimmedValue(formData, "email");
  const { siteUrl } = getSupabaseEnv();

  if (!email) {
    return encodedRedirect("error", "/auth/reset-password", "Email is required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return encodedRedirect("error", "/auth/reset-password", error.message);
  }

  return encodedRedirect(
    "success",
    "/auth/reset-password",
    "Password reset email sent. Open the recovery link from your inbox.",
  );
}

export async function updatePasswordAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/auth/reset-password", "Supabase is not configured.");
  }

  const password = getTrimmedValue(formData, "password");
  const confirmPassword = getTrimmedValue(formData, "confirmPassword");

  if (!password || !confirmPassword) {
    return encodedRedirect("error", "/auth/reset-password", "Fill in both password fields.");
  }

  if (password !== confirmPassword) {
    return encodedRedirect("error", "/auth/reset-password", "Passwords do not match.");
  }

  if (password.length < 8) {
    return encodedRedirect("error", "/auth/reset-password", "Password must be at least 8 characters.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect(
      "error",
      "/auth/reset-password",
      "Recovery session expired. Request a new reset email.",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return encodedRedirect("error", "/auth/reset-password", error.message);
  }

  return encodedRedirect("success", "/", "Password updated successfully. Please sign in again.");
}
