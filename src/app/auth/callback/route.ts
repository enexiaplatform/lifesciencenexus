import { NextResponse, type NextRequest } from "next/server";

import { sanitizeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth email callback (signup confirmation, password recovery). Supabase
 * redirects here with a `code`; we exchange it for a session cookie and send
 * the user on to `next` (sanitized) or the dashboard.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");

  const failure = new URL("/login?error=auth_callback_failed", request.url);

  if (!code) {
    return NextResponse.redirect(failure);
  }

  const supabase = await createClient();
  if (!supabase) {
    // Demo mode: no auth backend to exchange against.
    return NextResponse.redirect(failure);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(
    new URL(sanitizeNextPath(next), request.url),
  );
}
