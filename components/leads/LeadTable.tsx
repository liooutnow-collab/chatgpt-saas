"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/providers/types";
import { LeadRow, type LeadTableColumnKey } from "./LeadRow";
import { LeadCard } from "./LeadCard";
import { useSavedLeads } from "@/lib/hooks/use-saved-leads";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableLead extends Lead {
  savedAt?: string;
  searchId?: string;
}

interface Props {
  leads: TableLead[];
  searchId?: string;
  mode?: "results" | "saved";
}

const RESULT_COLUMNS: LeadTableColumnKey[] = [
  "business",
  "location",
  "website",
  "phone",
  "rating",
  "signals",
  "email",
  "source",
  "action",
];

const SAVED_COLUMNS: LeadTableColumnKey[] = [
  "business",
  "type",
  "location",
  "website",
  "phone",
  "savedAt",
  "rating",
  "email",
  "source",
  "action",
];

const LABELS: Record<LeadTableColumnKey, string> = {
  business: "Business",
  type: "Type",
  location: "Location",
  website: "Website",
  phone: "Phone",
  email: "Email",
  rating: "Rating / reviews",
  signals: "Signals",
  source: "Source",
  savedAt: "Saved",
  action: "Action",
};

const RESULT_DEFAULTS: LeadTableColumnKey[] = [
  "business",
  "location",
  "website",
  "phone",
  "rating",
  "signals",
  "action",
];

const SAVED_DEFAULTS: LeadTableColumnKey[] = [
  "business",
  "type",
  "location",
  "website",
  "phone",
  "savedAt",
  "action",
];

function sortValue(lead: TableLead, column: LeadTableColumnKey): string | number | null {
  switch (column) {
    case "business": return lead.businessName;
    case "type": return lead.businessType;
    case "location": return `${lead.city}, ${lead.country}`;
    case "website": return lead.website;
    case "phone": return lead.phone;
    case "email": return lead.email ?? null;
    case "rating": return lead.rating;
    case "signals": return `${lead.hasWebsite ? "1" : "0"}${lead.hasPhone ? "1" : "0"}${lead.websiteQuality}`;
    case "source": return lead.source;
    case "savedAt": return lead.savedAt ?? null;
    case "action": return null;
  }
}

export function LeadTable({ leads, searchId, mode = "results" }: Props) {
  const { save, unsave, isSaved } = useSavedLeads();
  const [sortColumn, setSortColumn] = useState<LeadTableColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<LeadTableColumnKey[]>(
    mode === "saved" ? SAVED_DEFAULTS : RESULT_DEFAULTS
  );

  const availableColumns = mode === "saved" ? SAVED_COLUMNS : RESULT_COLUMNS;
  const displayedColumns = availableColumns.filter((column) => visibleColumns.includes(column));
  const sortedLeads = useMemo(() => {
    if (!sortColumn || sortColumn === "action") return leads;
    return [...leads].sort((a, b) => {
      const left = sortValue(a, sortColumn);
      const right = sortValue(b, sortColumn);
      if (left === null || left === "") return right === null || right === "" ? 0 : 1;
      if (right === null || right === "") return -1;
      const comparison = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [leads, sortColumn, sortDirection]);

  const selectedLeads = leads.filter((lead) => selectedIds.has(lead.id));
  const savedSelected = selectedLeads.filter((lead) => isSaved(lead.id));
  const unsavedSelected = selectedLeads.filter((lead) => !isSaved(lead.id));
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;

  if (leads.length === 0) {
    return <div className="py-12 text-center text-sm text-slate-500">No leads found for this search.</div>;
  }

  const toggleColumn = (column: LeadTableColumnKey) => {
    if (column === "business" || column === "action") return;
    setVisibleColumns((current) => current.includes(column)
      ? current.filter((item) => item !== column)
      : [...current, column]);
  };

  const toggleSort = (column: LeadTableColumnKey) => {
    if (column === "action") return;
    if (sortColumn === column) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleSelected = (leadId: string, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  };

  const toggleAll = (selected: boolean) => {
    setSelectedIds(selected ? new Set(leads.map((lead) => lead.id)) : new Set());
  };

  const bulkSave = () => {
    for (const lead of unsavedSelected) {
      const sourceSearchId = lead.searchId ?? searchId;
      if (sourceSearchId) save(lead.id, sourceSearchId);
    }
    setSelectedIds(new Set());
  };

  const bulkUnsave = () => {
    for (const lead of savedSelected) unsave(lead.id);
    setSelectedIds(new Set());
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{leads.length} businesses</p>
        <div className="relative">
          <button
            type="button"
            aria-expanded={columnsOpen}
            aria-haspopup="true"
            onClick={() => setColumnsOpen((open) => !open)}
            onKeyDown={(event) => { if (event.key === "Escape") setColumnsOpen(false); }}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Columns
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {columnsOpen && (
            <div role="group" aria-label="Choose visible columns" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              {availableColumns.map((column) => {
                const required = column === "business" || column === "action";
                return (
                  <label key={column} className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-xs text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column)}
                      disabled={required}
                      onChange={() => toggleColumn(column)}
                      className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                    />
                    <span>{LABELS[column]}{required ? " (required)" : ""}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedLeads.length > 0 && (
        <div role="status" aria-live="polite" className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="mr-auto text-xs font-medium text-slate-700">{selectedLeads.length} selected</span>
          {mode === "saved" ? (
            <button type="button" onClick={bulkUnsave} className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100">
              Unsave selected
            </button>
          ) : (
            <>
              {unsavedSelected.length > 0 && (
                <button type="button" onClick={bulkSave} className="inline-flex min-h-9 items-center rounded-md bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700">
                  Save selected
                </button>
              )}
              {savedSelected.length > 0 && (
                <button type="button" onClick={bulkUnsave} className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  Unsave selected
                </button>
              )}
            </>
          )}
          <button type="button" onClick={() => setSelectedIds(new Set())} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs text-slate-500 hover:bg-white hover:text-slate-800">
            Clear
          </button>
        </div>
      )}

      <div className="hidden max-h-[65vh] overflow-auto rounded-lg border border-slate-200 bg-white sm:block">
        <table className="w-full min-w-[980px] text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr>
              <th scope="col" className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all leads"
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                />
              </th>
              {displayedColumns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  aria-sort={sortColumn === column ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500", column === "action" && "text-right")}
                >
                  {column === "action" ? LABELS[column] : (
                    <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label={`Sort by ${LABELS[column]}`}>
                      {LABELS[column]}
                      {sortColumn === column ? (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronDown className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedLeads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                searchId={searchId}
                mode={mode}
                savedAt={lead.savedAt}
                visibleColumns={displayedColumns}
                selected={selectedIds.has(lead.id)}
                onSelectedChange={(selected) => toggleSelected(lead.id, selected)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 sm:hidden">
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} searchId={lead.searchId ?? searchId ?? ""} />)}
      </div>
    </>
  );
}
