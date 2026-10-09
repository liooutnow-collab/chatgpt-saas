"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LockKeyhole, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AuthMode = "sign-in" | "sign-up";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectPath = safeNextPath(params.get("next"));
    setNextPath(redirectPath);

    const callbackError = params.get("error");
    const hashError = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      .get("error_description");
    if (callbackError === "confirmation_failed") {
      setError("Email confirmation could not be completed. Please try signing in or request a new confirmation email.");
    } else if (hashError) {
      setError(hashError.replaceAll("+", " "));
    }

    if (!isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) {
        router.replace(redirectPath);
        router.refresh();
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured()) {
      setError("Authentication is not configured yet. Please try again later.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
      } else {
        setNotice("Registration received. Check your inbox for an email verification link to activate your account. After confirming, you can return here to sign in.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 sm:min-h-screen">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-slate-900">Lead Intelligence</h1>
            <p className="text-sm text-slate-500">Sign in to manage your discoveries</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => { setMode("sign-in"); setError(null); setNotice(null); }}
            className={`min-h-10 rounded-md px-3 transition-colors ${mode === "sign-in" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("sign-up"); setError(null); setNotice(null); }}
            className={`min-h-10 rounded-md px-3 transition-colors ${mode === "sign-up" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Create account
          </button>
        </div>

        {!isSupabaseConfigured() && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Authentication is not configured for this deployment yet.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={mode === "sign-up" ? 8 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
            />
            {mode === "sign-up" && <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>}
          </div>

          {error && (
            <div role="alert" className="flex gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && <p role="status" className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockKeyhole className="h-4 w-4" />
            {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          Each account has a separate allowance of up to 100 lifetime discoveries. Only actual results returned count toward it.
        </p>
      </section>
    </main>
  );
}
