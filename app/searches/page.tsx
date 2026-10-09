"use client";

import { useSearches } from "@/lib/hooks/use-search";
import { SearchCard } from "@/components/search/SearchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";
import Link from "next/link";

export default function SearchesPage() {
  const { searches, cancelSearch, retrySearch, ready } = useSearches();

  const active = searches.filter((s) =>
    ["searching", "collecting", "checking"].includes(s.status)
  );
  const queued = searches.filter((s) => s.status === "queued");
  const completed = searches.filter((s) => s.status === "completed");
  const cancelled = searches.filter((s) => s.status === "cancelled");
  const failed = searches.filter((s) => s.status === "error");

  const Section = ({
    title,
    items,
  }: {
    title: string;
    items: typeof searches;
  }) => {
    if (items.length === 0) return null;
    return (
      <section>
        <h2 className="text-sm font-medium text-slate-900 mb-3">
          {title}{" "}
          <span className="text-slate-400 font-normal">({items.length})</span>
        </h2>
        <div className="space-y-3">
          {items.map((s) => (
            <SearchCard
              key={s.id}
              search={s}
              onCancel={cancelSearch}
              onRetry={retrySearch}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            Searches
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track active, queued, and past search jobs
          </p>
        </div>
        <Link
          href="/find-leads"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors self-start"
        >
          New Search
        </Link>
      </div>

      {!ready ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <EmptyState
          icon={History}
          title="No searches yet"
          description="Create your first search to discover businesses by type and location."
          action={
            <Link
              href="/find-leads"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            >
              Find Leads
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <Section title="Active" items={active} />
          <Section title="Queued" items={queued} />
          <Section title="Completed" items={completed} />
          <Section title="Cancelled" items={cancelled} />
          <Section title="Failed" items={failed} />
        </div>
      )}
    </div>
  );
}
