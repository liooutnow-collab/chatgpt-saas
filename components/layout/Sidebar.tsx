"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  History,
  Bookmark,
  Settings,
  Menu,
  X,
  Sparkles,
  LogIn,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { usageManager } from "@/lib/usage/usage-manager";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/find-leads", label: "Find Leads", icon: Search },
  { href: "/searches", label: "Searches", icon: History },
  { href: "/saved-leads", label: "Saved Leads", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setEmail(session?.user.email ?? null);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        usageManager.resetForAuthChange();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (pathname === "/login") return null;

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setAuthError(null);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
      setAuthError("Sign out could not be completed. Please try again.");
    }
  };

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-900">Lead Intelligence</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-slate-950 text-slate-100 transition-transform duration-200",
          "lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium tracking-tight">Lead Intelligence</div>
            <div className="text-[11px] text-slate-400">Free Plan</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-4">
          {email ? (
            <>
              <p className="mb-3 truncate text-xs text-slate-400" title={email}>{email}</p>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Sign in to search
            </Link>
          )}
          {authError && <p role="alert" className="mb-2 text-xs text-red-300">{authError}</p>}
          <div className="text-[11px] leading-relaxed text-slate-500">
            {email ? (
              <>Server-side lead provider connected.<br />Lifetime usage is enforced per account.</>
            ) : (
              <>Sign in to start new searches.<br />Usage is enforced per account.</>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
