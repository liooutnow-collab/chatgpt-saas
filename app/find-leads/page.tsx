"use client";

import { SearchForm } from "@/components/search/SearchForm";
import { UsageMeter } from "@/components/ui/UsageMeter";
import { useSearches } from "@/lib/hooks/use-search";
import { SearchCard } from "@/components/search/SearchCard";

export default function FindLeadsPage() {
  const { searches, cancelSearch, retrySearch } = useSearches();
  const active = searches.filter((s) =>
    ["searching", "collecting", "checking", "queued"].includes(s.status)
  );

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
                Currently Running
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
        </div>
      </div>
    </div>
  );
}
