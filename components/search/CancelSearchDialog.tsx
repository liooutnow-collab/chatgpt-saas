"use client";

import { SearchJob } from "@/lib/providers/types";

interface Props {
  search: SearchJob;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CancelSearchDialog({ search, onConfirm, onCancel }: Props) {
  const isQueued = search.status === "queued";
  const found = search.processedLeads;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
        <h2 className="text-lg font-medium text-slate-900 mb-2">
          Cancel this search?
        </h2>
        <p className="text-sm text-slate-600 mb-1">
          <span className="font-medium text-slate-800">
            {search.businessType}s in {search.location}
          </span>
        </p>
        {isQueued ? (
          <p className="text-sm text-slate-500 mb-6">
            This search has not started yet. It will be removed from the queue
            with 0 leads processed.
          </p>
        ) : (
          <p className="text-sm text-slate-500 mb-6">
            {found} lead{found !== 1 ? "s have" : " has"} already been found.
            These results will remain available.
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Continue Search
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Cancel Search
          </button>
        </div>
      </div>
    </div>
  );
}
