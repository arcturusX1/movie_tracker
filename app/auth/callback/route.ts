import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    // Usually a missing PKCE verifier cookie: sign-in started on a different host
    // (e.g. 127.0.0.1 or the WSL IP) than the one it returned to.
    console.error("OAuth code exchange failed", { origin, error: error.message });
  } else {
    console.error("OAuth callback without code", {
      origin,
      error: searchParams.get("error"),
      description: searchParams.get("error_description"),
    });
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}

/** Only allow same-origin relative paths to avoid open redirects. */
function safeNext(next: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/library/watched";
}
