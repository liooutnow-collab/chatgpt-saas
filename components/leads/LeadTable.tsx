"use client";

import { Lead } from "@/lib/providers/types";
import { LeadRow } from "./LeadRow";
import { LeadCard } from "./LeadCard";

interface Props {
  leads: Lead[];
  searchId: string;
}

export function LeadTable({ leads, searchId }: Props) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-slate-500">
        No leads found for this search.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Business
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Contact
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Location
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Signals
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} searchId={searchId} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} searchId={searchId} />
        ))}
      </div>
    </>
  );
}
