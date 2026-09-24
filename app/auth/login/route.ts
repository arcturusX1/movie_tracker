import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts Google OAuth on the server, so the sign-in button is a plain link that
 * works before client JS hydrates. Supabase stores the PKCE verifier in a cookie
 * that /auth/callback reads back.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const next = searchParams.get("next");

  const redirectTo = new URL("/auth/callback", origin);
  if (next) redirectTo.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo.toString() },
  });

  if (error || !data.url) {
    console.error("Google sign-in failed to start", error);
    return NextResponse.redirect(new URL("/login?error=start", origin));
  }

  return NextResponse.redirect(data.url);
}
