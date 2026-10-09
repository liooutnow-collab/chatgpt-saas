"use client";

import { useSearches } from "@/lib/hooks/use-search";
import { useSavedLeads } from "@/lib/hooks/use-saved-leads";
import { Search, Bookmark, Activity, CheckCircle2 } from "lucide-react";

export function DashboardStats() {
  const { searches, ready } = useSearches();
  const { count: savedCount } = useSavedLeads();

  if (!ready) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse"
          />
        ))}
      </div>
    );
  }

  const leadsFound = searches.reduce((s, j) => s + j.processedLeads, 0);
  const active = searches.filter((s) =>
    ["searching", "collecting", "checking", "queued"].includes(s.status)
  ).length;
  const completed = searches.filter((s) => s.status === "completed").length;

  const cards = [
    {
      label: "Leads Found",
      value: leadsFound,
      icon: Search,
      color: "text-slate-700",
    },
    {
      label: "Leads Saved",
      value: savedCount,
      icon: Bookmark,
      color: "text-slate-700",
    },
    {
      label: "Active Searches",
      value: active,
      icon: Activity,
      color: "text-blue-600",
    },
    {
      label: "Completed Searches",
      value: completed,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {c.label}
              </span>
              <Icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <div className="text-2xl sm:text-3xl font-medium text-slate-900 tabular-nums">
              {c.value.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
