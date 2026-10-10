"use client";

import { SearchJob } from "@/lib/providers/types";
import { cn } from "@/lib/utils";

export function SearchProgress({ search }: { search: SearchJob }) {
  const isActive = ["searching", "collecting", "checking"].includes(
    search.status
  );
  const isQueued = search.status === "queued";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{search.statusMessage}</span>
        <span className="flex items-center gap-2 font-medium text-slate-800 tabular-nums">
          <span>{search.processedLeads} / {search.requestedLeads} found</span>
          <span className="text-xs font-normal text-slate-500">{Math.round(search.progress)}%</span>
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
      {(isActive || isQueued) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {isQueued ? (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" />
          ) : (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-slate-500" />
            </span>
          )}
          {isQueued ? "Queued · waiting to start" : "Processing…"}
        </div>
      )}
    </div>
  );
}
