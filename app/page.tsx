"use client";

import Link from "next/link";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { SearchCard } from "@/components/search/SearchCard";
import { UsageMeter } from "@/components/ui/UsageMeter";
import { useSearches } from "@/lib/hooks/use-search";
import { useSavedLeads } from "@/lib/hooks/use-saved-leads";
import { Search, Bookmark, ArrowRight } from "lucide-react";
import { formatRelative } from "@/lib/utils";

export default function DashboardPage() {
  const { searches, cancelSearch, retrySearch, ready } = useSearches();
  const { saved } = useSavedLeads();

  const active = searches.filter((s) =>
    ["searching", "collecting", "checking", "queued"].includes(s.status)
  );
  const recent = searches
    .filter((s) =>
      ["completed", "cancelled", "error"].includes(s.status)
    )
    .slice(0, 5);
  const recentSaved = saved.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of your lead discovery activity
          </p>
        </div>
        <Link
          href="/find-leads"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors self-start"
        >
          <Search className="w-4 h-4" />
          Find Leads
        </Link>
      </div>

      <DashboardStats />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Searches */}
          <section>
            <h2 className="text-sm font-medium text-slate-900 mb-3">
              Active Searches
            </h2>
            {!ready ? (
              <div className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse" />
            ) : active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">
                  No active searches.{" "}
                  <Link
                    href="/find-leads"
                    className="text-slate-900 font-medium underline"
                  >
                    Start one
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {active.map((s) => (
                  <SearchCard
                    key={s.id}
                    search={s}
                    onCancel={cancelSearch}
                    onRetry={retrySearch}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Recent Searches */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-900">
                Recent Searches
              </h2>
              <Link
                href="/searches"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Completed searches will appear here
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((s) => (
                  <SearchCard
                    key={s.id}
                    search={s}
                    onCancel={cancelSearch}
                    onRetry={retrySearch}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <UsageMeter />

          {/* Recent Saved */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-900">
                Recent Saved Leads
              </h2>
              <Link
                href="/saved-leads"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentSaved.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <Bookmark className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No saved leads yet</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {recentSaved.map((l) => (
                  <div key={l.id} className="px-4 py-3">
                    <div className="font-medium text-sm text-slate-900 truncate">
                      {l.businessName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {l.businessType} · {l.city} · {formatRelative(l.savedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
