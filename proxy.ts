import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const acceptsMarkdown = request.headers.get("accept")?.includes("text/markdown") ?? false;
  if (acceptsMarkdown && pathname === "/") {
    return new Response(`# L.I.O.\n\nL.I.O. is a business lead discovery workspace for agencies, freelancers, and sales teams. Search by business type and location, review structured business details, save promising leads, and prepare results for outreach.\n\n## When to use L.I.O.\n\nUse L.I.O. to discover local businesses, build targeted prospect lists, and organize qualified leads. Start at https://outreach-saas-lio-8f66.vercel.app/about or create an account at https://outreach-saas-lio-8f66.vercel.app/login.\n`, { status: 200, headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" } });
  }
  if (acceptsMarkdown && pathname !== "/" && !pathname.startsWith("/api/") && !["/about", "/contact", "/privacy", "/login", "/llms.txt", "/sitemap.xml", "/robots.txt"].includes(pathname)) {
    return new Response(`# Page not found\n\nThe requested L.I.O. page does not exist. Visit https://outreach-saas-lio-8f66.vercel.app/ or read https://outreach-saas-lio-8f66.vercel.app/llms.txt.\n`, { status: 404, headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" } });
  }
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
