import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (config) {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Refresh only. Every protected page/action separately verifies its user.
    await supabase.auth.getClaims();
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
