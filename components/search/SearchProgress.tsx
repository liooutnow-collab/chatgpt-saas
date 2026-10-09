"use client";

import { SearchJob } from "@/lib/providers/types";
import { cn } from "@/lib/utils";

export function SearchProgress({ search }: { search: SearchJob }) {
  const isActive = ["searching", "collecting", "checking"].includes(
    search.status
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{search.statusMessage}</span>
        <span className="font-medium text-slate-800 tabular-nums">
          {search.processedLeads} / {search.requestedLeads} found
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            search.status === "completed"
              ? "bg-emerald-500"
              : search.status === "cancelled"
              ? "bg-amber-400"
              : search.status === "error"
              ? "bg-red-400"
              : "bg-slate-800"
          )}
          style={{ width: `${search.progress}%` }}
        />
      </div>
      {isActive && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500" />
          </span>
          Processing…
        </div>
      )}
    </div>
  );
}
