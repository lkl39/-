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
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("status", "error");
      loginUrl.searchParams.set("message", "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u8bbf\u95ee\u5de5\u4f5c\u53f0\u3002");
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
