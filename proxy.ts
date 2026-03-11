import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware-client";

export async function proxy(request: NextRequest) {
  const result = updateSession(request);
  const response = result instanceof NextResponse ? result : result.response;

  if (!hasSupabaseEnv()) {
    return response;
  }

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const sessionResponse = result instanceof NextResponse ? null : result;
    const {
      data: { user },
    } = await sessionResponse!.supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("status", "error");
      loginUrl.searchParams.set("message", "Please sign in before opening the dashboard.");
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
