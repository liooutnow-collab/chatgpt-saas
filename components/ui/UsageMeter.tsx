"use client";

import { useUsage } from "@/lib/hooks/use-usage";
import { cn } from "@/lib/utils";

export function UsageMeter({ compact = false }: { compact?: boolean }) {
  const { usage, remaining, loading, error, refresh } = useUsage();
  const pct = Math.min(100, Math.round(((usage.used + usage.reserved) / usage.limit) * 100));
  const nearLimit = remaining <= 20;

  if (loading) {
    return (
      <div className={compact ? "text-xs text-slate-500" : "rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"}>
        Checking lifetime usage…
      </div>
    );
  }

  if (error) {
    return (
      <div className={compact ? "flex items-center gap-2 text-xs text-amber-700" : "rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"} role="status">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className={compact ? "shrink-0 underline underline-offset-2" : "mt-2 block text-xs font-medium underline underline-offset-2"}
        >
          Retry
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-medium uppercase tracking-wide text-[10px] text-slate-700">
          Lifetime
        </span>
        <span>{usage.used}/{usage.limit}</span>
        {usage.reserved > 0 && <span className="text-slate-400">+{usage.reserved} held</span>}
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-all", nearLimit ? "bg-amber-500" : "bg-slate-700")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Lifetime allowance
        </span>
        <span className={cn("text-sm font-medium", nearLimit ? "text-amber-600" : "text-slate-700")}>
          {usage.used} / {usage.limit} used
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-500", nearLimit ? "bg-amber-500" : "bg-slate-800")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {remaining} lifetime discoveries remaining
        {usage.reserved > 0 && ` · ${usage.reserved} reserved for in-progress searches`}
      </p>
    </div>
  );
}
