"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SearchForm } from "@/components/search/SearchForm";
import { UsageMeter } from "@/components/ui/UsageMeter";
import { useSearches } from "@/lib/hooks/use-search";
import { SearchCard } from "@/components/search/SearchCard";
import { SearchCardSkeleton } from "@/components/search/SearchCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchCompleteCelebration } from "@/components/ui/SearchCompleteCelebration";
import { PRESS_FEEDBACK_CLASS } from "@/components/ui/press-feedback";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export default function FindLeadsPage() {
  const { searches, ready, cancelSearch, retrySearch } = useSearches();
  const initializedCompletedIds = useRef<Set<string> | null>(null);
  const [celebratingSearchId, setCelebratingSearchId] = useState<string | null>(null);
  const active = searches.filter((s) =>
    ["searching", "collecting", "checking", "queued"].includes(s.status)
  );
  const needsReview = searches
    .filter((s) => s.status === "cancelled" || s.status === "error")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  useEffect(() => {
    if (!ready) return;
    const completedIds = searches.filter((search) => search.status === "completed").map((search) => search.id);
    if (!initializedCompletedIds.current) {
      initializedCompletedIds.current = new Set(completedIds);
      return;
    }
    const newlyCompleted = completedIds.filter((id) => !initializedCompletedIds.current?.has(id));
    completedIds.forEach((id) => initializedCompletedIds.current?.add(id));
    if (newlyCompleted.length > 0) setCelebratingSearchId(newlyCompleted[newlyCompleted.length - 1]);
  }, [ready, searches]);
  const clearCelebration = useCallback(() => setCelebratingSearchId(null), []);

  return (
    <div className="space-y-8">
      {celebratingSearchId && <SearchCompleteCelebration searchId={celebratingSearchId} onComplete={clearCelebration} />}
      <div>
        <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
          Find Leads
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Discover businesses worth contacting by type and location
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div id="search-form" className="lg:col-span-2">
          <SearchForm />
        </div>
        <div className="space-y-4">
          <UsageMeter />
          {!ready ? (
            <div className="space-y-3" aria-label="Loading current searches"><SearchCardSkeleton /><SearchCardSkeleton /></div>
          ) : active.length > 0 ? (
            <div>
              <h2 className="text-sm font-medium text-slate-900 mb-3">
                Current Searches
              </h2>
              <div className="motion-stagger space-y-3">
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
          ) : needsReview.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white"><EmptyState icon={Search} title="No searches in progress" description="Choose a business type and location to start building your next prospect list." action={<Link href="#search-form" className={`${PRESS_FEEDBACK_CLASS} inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white`}>Start a search</Link>} /></div>
          ) : null}
          {needsReview.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-slate-900">Interrupted &amp; failed</h2>
                <Link href="/searches" className={`${PRESS_FEEDBACK_CLASS} inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800`}>
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="mb-3 text-xs text-slate-500">Review partial results or retry a failed search.</p>
              <div className="motion-stagger space-y-3">
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
