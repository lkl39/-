"use server";

import { encodedRedirect } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

function getTrimmedValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateProfileAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/dashboard/account", "Supabase is not configured.");
  }

  const displayName = getTrimmedValue(formData, "displayName");
  const teamName = getTrimmedValue(formData, "teamName");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/", "Please sign in before updating your profile.");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    display_name: displayName || null,
    team_name: teamName || null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return encodedRedirect("error", "/dashboard/account", error.message);
  }

  return encodedRedirect("success", "/dashboard/account", "Profile updated successfully.");
}
