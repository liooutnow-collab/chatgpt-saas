const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export function getSupabaseConfig() {
  if (!supabaseUrl || !publishableKey) return null;
  return { url: supabaseUrl, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && publishableKey);
}
