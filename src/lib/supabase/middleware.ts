import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decideAccess } from "@/lib/auth/gating";

/**
 * Refresh the Supabase auth session on each request and, when Supabase env
 * vars are configured, gate workspace routes: anonymous requests to
 * non-public paths are redirected to `/login?next=…` (see
 * `src/lib/auth/gating.ts`). In demo mode (no env vars) this is a no-op
 * pass-through and every route stays open.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the session; do not remove this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate workspace routes now that env vars are present (auth enabled).
  const decision = decideAccess(request.nextUrl.pathname, !!user, true);
  if (!decision.allow) {
    return NextResponse.redirect(new URL(decision.redirectTo, request.url));
  }

  return response;
}
