"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearch } from "@/lib/hooks/use-search";
import { useSearches } from "@/lib/hooks/use-search";
import { SearchProgress } from "@/components/search/SearchProgress";
import { SearchStatusBadge } from "@/components/ui/SearchStatusBadge";
import { LeadTable } from "@/components/leads/LeadTable";
import { CancelSearchDialog } from "@/components/search/CancelSearchDialog";
import { formatDate, pluralizeBusinessType } from "@/lib/utils";
import { summarizeBrief } from "@/lib/search-brief";
import {
  ArrowLeft,
  CheckCircle2,
  X,
  RotateCcw,
  SlidersHorizontal,
  Globe,
  Phone,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { search, leads } = useSearch(id);
  const { cancelSearch, retrySearch } = useSearches();
  const [showCancel, setShowCancel] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (search?.status !== "error") setRetrying(false);
  }, [search?.status]);

  if (!search) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500">Search not found.</p>
        <Link
          href="/searches"
          className="text-sm text-slate-900 underline mt-2 inline-block"
        >
          Back to searches
        </Link>
      </div>
    );
  }

  const isActive = ["searching", "collecting", "checking", "queued"].includes(
    search.status
  );
  const isDone =
    search.status === "completed" ||
    search.status === "cancelled" ||
    search.status === "error";

  const withWebsite = leads.filter((l) => l.hasWebsite).length;
  const withPhone = leads.filter((l) => l.hasPhone).length;
  const unique = leads.length;
  const canFormat = isDone && leads.length > 0;
  const briefSummary = summarizeBrief(search.brief);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/searches"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Searches
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
                {pluralizeBusinessType(search.businessType)} in {search.location}
              </h1>
              <SearchStatusBadge status={search.status} />
            </div>
            <p className="text-sm text-slate-500">
              Created {formatDate(search.createdAt)}
              {search.completedAt && ` · Finished ${formatDate(search.completedAt)}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canFormat && (
              <Link
                href={`/searches/${search.id}/format`}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Customize Results
              </Link>
            )}
            {isActive && (
              <button
                onClick={() => setShowCancel(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
            {search.status === "error" && (
              <button
                type="button"
                disabled={retrying}
                onClick={() => {
                  if (retrying) return;
                  setRetrying(true);
                  const nextJob = retrySearch(search.id);
                  if (nextJob && nextJob.id !== search.id) {
                    router.push(`/searches/${nextJob.id}`);
                  }
                  else setRetrying(false);
                }}
                aria-label={retrying ? "Retrying search" : "Retry search"}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 h-10 px-3 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                <RotateCcw className="w-4 h-4" />
                {retrying ? "Retrying…" : "Retry"}
              </button>
            )}
          </div>
        </div>
      </div>

      {search.brief && (
        <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">Search Brief</summary>
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500 sm:grid-cols-3">
            <p><span className="font-medium text-slate-700">Goal:</span> {search.brief.goal || "Not specified"}</p>
            <p><span className="font-medium text-slate-700">Priorities:</span> {briefSummary[1] || "None"}</p>
            <p><span className="font-medium text-slate-700">Selectivity:</span> {briefSummary[0] || "Balanced"}</p>
            {search.brief.additionalInstruction && <p className="sm:col-span-3"><span className="font-medium text-slate-700">Instruction:</span> {search.brief.additionalInstruction}</p>}
          </div>
        </details>
      )}

      {/* Progress / Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        {isActive && <SearchProgress search={search} />}

        {search.status === "completed" && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
                <h2 className="font-medium text-slate-900">
                  {search.processedLeads === 0 ? "No Results Found" : "Search Complete"}
                </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {search.requestedLeads} requested · {search.processedLeads}{" "}
                found
              </p>
            </div>
          </div>
        )}

        {search.status === "cancelled" && (
          <div>
            <h2 className="font-medium text-slate-900">Search Cancelled</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {search.processedLeads} lead
              {search.processedLeads !== 1 ? "s" : ""} found before cancellation
            </p>
          </div>
        )}

        {search.status === "error" && (
          <div>
            <h2 className="font-medium text-red-700">Search Failed</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {search.errorMessage ||
                "The lead provider could not complete this search."}
            </p>
          </div>
        )}

        {isDone && leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <div className="text-lg font-medium text-slate-900 tabular-nums">
                {unique}
              </div>
              <div className="text-xs text-slate-500">Unique leads</div>
            </div>
            <div>
              <div className="text-lg font-medium text-slate-900 tabular-nums flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                {withWebsite}
              </div>
              <div className="text-xs text-slate-500">With websites</div>
            </div>
            <div>
              <div className="text-lg font-medium text-slate-900 tabular-nums flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {withPhone}
              </div>
              <div className="text-xs text-slate-500">With phone</div>
            </div>
            <div>
              <div className="text-lg font-medium text-slate-900 tabular-nums">
                {search.requestedLeads}
              </div>
              <div className="text-xs text-slate-500">Requested</div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {(leads.length > 0 || isDone) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-900">
              Results{" "}
              <span className="text-slate-400 font-normal">
                ({leads.length})
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {search.provider || leads[0]?.source || "Lead provider"} results
            </p>
          </div>
          <LeadTable leads={leads} searchId={search.id} />
        </div>
      )}

      {showCancel && (
        <CancelSearchDialog
          search={search}
          onConfirm={() => {
            cancelSearch(search.id);
            setShowCancel(false);
          }}
          onCancel={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
