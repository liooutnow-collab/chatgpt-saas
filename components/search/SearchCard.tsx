"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchJob } from "@/lib/providers/types";
import { SearchStatusBadge } from "@/components/ui/SearchStatusBadge";
import { SearchProgress } from "./SearchProgress";
import { CancelSearchDialog } from "./CancelSearchDialog";
import { formatRelative, pluralizeBusinessType } from "@/lib/utils";
import { X, Eye, RotateCcw, MapPin } from "lucide-react";

interface Props {
  search: SearchJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => SearchJob | null;
}

export function SearchCard({ search, onCancel, onRetry }: Props) {
  const [showCancel, setShowCancel] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (search.status !== "error") setRetrying(false);
  }, [search.status]);

  const isActive = ["searching", "collecting", "checking", "queued"].includes(
    search.status
  );
  const canView =
    search.status === "completed" ||
    search.status === "cancelled" ||
    (search.processedLeads > 0 && search.status === "error");

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-medium text-slate-900 truncate">
              {pluralizeBusinessType(search.businessType)} in {search.location}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              <span>{search.location}</span>
              <span>·</span>
              <span>{formatRelative(search.createdAt)}</span>
            </div>
          </div>
          <SearchStatusBadge status={search.status} />
        </div>

        {(isActive ||
          search.status === "completed" ||
          search.status === "cancelled" ||
          search.status === "error") && (
          <div className="mb-4">
            <SearchProgress search={search} />
          </div>
        )}

        {search.status === "error" && search.errorMessage && (
          <p className="text-sm text-red-600 mb-3">{search.errorMessage}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isActive && (
            <button
              onClick={() => setShowCancel(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel Search
            </button>
          )}

          {canView && (
            <Link
              href={`/searches/${search.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View Results
            </Link>
          )}

          {search.status === "error" && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => {
                if (retrying) return;
                setRetrying(true);
                const nextJob = onRetry(search.id);
                if (nextJob && nextJob.id !== search.id) {
                  router.push(`/searches/${nextJob.id}`);
                }
                else setRetrying(false);
              }}
              aria-label={retrying ? "Retrying search" : "Retry search"}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:cursor-wait disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {retrying ? "Retrying…" : "Retry"}
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400 tabular-nums">
            {search.requestedLeads} requested
          </div>
        </div>
      </div>

      {showCancel && (
        <CancelSearchDialog
          search={search}
          onConfirm={() => {
            onCancel(search.id);
            setShowCancel(false);
          }}
          onCancel={() => setShowCancel(false)}
        />
      )}
    </>
  );
}
