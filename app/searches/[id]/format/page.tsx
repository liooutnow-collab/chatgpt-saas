"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearch } from "@/lib/hooks/use-search";
import { ResultFormatter } from "@/components/formatter/ResultFormatter";
import { pluralizeBusinessType } from "@/lib/utils";

export default function FormatSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { search, leads } = useSearch(id);

  if (!search) {
    return <div className="py-16 text-center text-sm text-slate-500">Search not found.</div>;
  }

  const canFormat = ["completed", "cancelled", "error"].includes(search.status) && leads.length > 0;
  if (!canFormat) {
    return (
      <div className="space-y-4 py-8">
        <Link href={`/searches/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h1 className="font-medium text-slate-900">No results to format</h1>
          <p className="mt-1 text-sm text-slate-500">Formatter and export become available after this search returns at least one lead.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/searches/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to results
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{search.processedLeads} results available</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-slate-900">{pluralizeBusinessType(search.businessType)} in {search.location}</h1>
        {search.status !== "completed" && <p className="mt-1 text-sm text-amber-700">These are partial results from a {search.status === "error" ? "failed" : "cancelled"} search.</p>}
      </div>
      <ResultFormatter searchId={search.id} businessType={search.businessType} location={search.location} leads={leads} />
    </div>
  );
}
