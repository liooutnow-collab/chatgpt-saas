"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase authentication is not configured.");
  }

  browserClient = createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
