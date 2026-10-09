import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("[api/usage] Supabase configuration is unavailable.");
      return response({ error: { message: "Usage service is not configured." } }, 503);
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError && userError.name !== "AuthSessionMissingError") {
      console.error("[api/usage] Supabase authentication check failed.", {
        code: userError.code ?? "unknown",
      });
      return response({ error: { message: "Usage authentication could not be verified." } }, 503);
    }
    if (!userResult?.user) {
      return response({ error: { message: "Please sign in to view usage." } }, 401);
    }

    const { data, error } = await supabase.rpc("get_discovery_usage");
    if (error) {
      console.error("[api/usage] Discovery quota RPC failed.", { code: error.code });
      return response({ error: { message: "Usage could not be loaded." } }, 503);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.error("[api/usage] Discovery quota RPC returned no row.");
      return response({ error: { message: "Usage could not be loaded." } }, 503);
    }

    return response({
      used: Number(row.used_count),
      reserved: Number(row.reserved_count),
      remaining: Number(row.remaining_count),
      limit: Number(row.lifetime_limit),
      plan: "free",
    });
  } catch (error) {
    console.error("[api/usage] Unexpected handler failure.", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return response({ error: { message: "Usage could not be loaded." } }, 503);
  }
}
