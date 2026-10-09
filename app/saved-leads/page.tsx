"use client";

import { useSavedLeads } from "@/lib/hooks/use-saved-leads";
import { LeadCard } from "@/components/leads/LeadCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bookmark, BookmarkX } from "lucide-react";
import Link from "next/link";
import { formatRelative } from "@/lib/utils";

export default function SavedLeadsPage() {
  const { saved, unsave, count } = useSavedLeads();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
          Saved Leads
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {count === 0
            ? "Businesses you save will appear here"
            : `${count} saved lead${count !== 1 ? "s" : ""}`}
        </p>
      </div>

      {count === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved leads"
          description="When you find promising businesses, save them here for later outreach."
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
        <div className="space-y-3">
          {/* Desktop-ish list */}
          <div className="hidden sm:block rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {saved.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {lead.businessName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {lead.businessType} · {lead.city}, {lead.country}
                    {lead.website && ` · ${lead.website}`}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Saved {formatRelative(lead.savedAt)}
                  </div>
                </div>
                <button
                  onClick={() => unsave(lead.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0"
                >
                  <BookmarkX className="w-3.5 h-3.5" />
                  Unsave
                </button>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {saved.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                searchId={lead.searchId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
