"use client";

import { SearchForm } from "@/components/search/SearchForm";
import { UsageMeter } from "@/components/ui/UsageMeter";
import { useSearches } from "@/lib/hooks/use-search";
import { SearchCard } from "@/components/search/SearchCard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FindLeadsPage() {
  const { searches, cancelSearch, retrySearch } = useSearches();
  const active = searches.filter((s) =>
    ["searching", "collecting", "checking", "queued"].includes(s.status)
  );
  const needsReview = searches
    .filter((s) => s.status === "cancelled" || s.status === "error")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
          Find Leads
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Discover businesses worth contacting by type and location
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SearchForm />
        </div>
        <div className="space-y-4">
          <UsageMeter />
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-900 mb-3">
                Current Searches
              </h2>
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
            </div>
          )}
          {needsReview.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-slate-900">Interrupted &amp; failed</h2>
                <Link href="/searches" className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="mb-3 text-xs text-slate-500">Review partial results or retry a failed search.</p>
              <div className="space-y-3">
                {needsReview.map((s) => (
                  <SearchCard key={s.id} search={s} onCancel={cancelSearch} onRetry={retrySearch} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
