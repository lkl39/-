import { createClient } from "@/lib/supabase/server-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type CurrentProfile = {
  userId: string | null;
  userEmail: string | null;
  displayName: string | null;
  teamName: string | null;
};

export async function getCurrentProfile(): Promise<CurrentProfile> {
  if (!hasSupabaseEnv()) {
    return {
      userId: null,
      userEmail: null,
      displayName: null,
      teamName: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      userEmail: null,
      displayName: null,
      teamName: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, team_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    displayName:
      typeof profile?.display_name === "string" ? profile.display_name : null,
    teamName:
      typeof profile?.team_name === "string"
        ? profile.team_name
        : typeof user.user_metadata?.team_name === "string"
          ? user.user_metadata.team_name
          : null,
  };
}
