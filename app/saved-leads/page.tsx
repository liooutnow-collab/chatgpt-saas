"use client";

import Link from "next/link";
import { Bookmark, ArrowRight, History } from "lucide-react";
import { useSavedLeads } from "@/lib/hooks/use-saved-leads";
import { LeadTable } from "@/components/leads/LeadTable";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SavedLeadsPage() {
  const { saved, count } = useSavedLeads();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">Saved Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            {count === 0 ? "Businesses you save will appear here" : `${count} saved lead${count !== 1 ? "s" : ""}`}
          </p>
        </div>
        {count > 0 && (
          <Link href="/searches" className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:self-auto">
            <History className="h-3.5 w-3.5" />Review searches<ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {count === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved leads"
          description="When you find promising businesses, save them here for later outreach."
          action={
            <Link href="/find-leads" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
              Find Leads
            </Link>
          }
        />
      ) : (
        <LeadTable leads={saved} mode="saved" />
      )}
    </div>
  );
}
