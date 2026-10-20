"use client";

import { useUsage } from "@/lib/hooks/use-usage";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Skeleton } from "@/components/ui/Skeleton";
import { PRESS_FEEDBACK_CLASS } from "@/components/ui/press-feedback";

export function UsageMeter({ compact = false }: { compact?: boolean }) {
  const { usage, remaining, loading, error, refresh } = useUsage();
  const pct = Math.min(100, Math.round(((usage.used + usage.reserved) / usage.limit) * 100));
  const nearLimit = remaining <= Math.max(2, Math.ceil(usage.limit * 0.2));
  const resetLabel = usage.resetAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(usage.resetAt))
    : "soon";

  if (loading) {
    return (
      <div className={compact ? "flex items-center gap-2 text-xs text-slate-500" : "motion-card rounded-xl border border-slate-200 bg-white p-4"} aria-label="Loading usage">
        {compact ? <><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-10" /><Skeleton className="h-1.5 w-16 rounded-full" /></> : <><div className="mb-3 flex items-center justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-20" /></div><Skeleton className="h-2 w-full rounded-full" /><Skeleton className="mt-3 h-3 w-48" /></>}
      </div>
    );
  }

  if (error) {
    return (
      <div className={compact ? "flex items-center gap-2 text-xs text-amber-700" : "motion-card rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"} role="status">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className={cn(PRESS_FEEDBACK_CLASS, compact ? "shrink-0 underline underline-offset-2" : "mt-2 block rounded px-1 text-xs font-medium underline underline-offset-2")}
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
          {usage.planName}
        </span>
        <span><AnimatedNumber value={usage.used} />/<AnimatedNumber value={usage.limit} /></span>
        {usage.reserved > 0 && <span className="text-slate-400">+<AnimatedNumber value={usage.reserved} /> held</span>}
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
    <div className="motion-card rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {usage.planName} · {usage.periodLabel} allowance
        </span>
        <span className={cn("text-sm font-medium", nearLimit ? "text-amber-600" : "text-slate-700")}>
          <AnimatedNumber value={usage.used} /> / <AnimatedNumber value={usage.limit} /> used
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-500", nearLimit ? "bg-amber-500" : "bg-slate-800")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        <AnimatedNumber value={remaining} /> lead units remaining · resets {resetLabel}
        {usage.reserved > 0 && <> · <AnimatedNumber value={usage.reserved} /> reserved for in-progress searches</>}
      </p>
    </div>
  );
}
