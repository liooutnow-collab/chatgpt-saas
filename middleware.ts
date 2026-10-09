import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/login" ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/auth/verified" ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const publicProduction = process.env.VERCEL_ENV === "production";
  const config = getSupabaseConfig();
  if (!config) {
    if (publicProduction) return NextResponse.next({ request });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "?setup=missing";
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (publicProduction) {
    // Public production pages can be browsed without an account. Keep refreshing
    // sessions when available; API routes still enforce auth and quota.
    try {
      await supabase.auth.getClaims();
    } catch {
      // Authentication outages must not block public page navigation.
    }
    return response;
  }

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
