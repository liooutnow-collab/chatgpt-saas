"use client";

import { useState } from "react";
import type { Lead } from "@/lib/providers/types";
import { useSavedLeads } from "@/lib/hooks/use-saved-leads";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Star,
  AlertTriangle,
  BookmarkX,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { getMapHref, getPhoneHref, getWebsiteHref } from "@/lib/contact-links";
import { LeadDetailsDialog } from "./LeadDetailsDialog";

export type LeadTableColumnKey =
  | "business"
  | "type"
  | "location"
  | "website"
  | "phone"
  | "email"
  | "rating"
  | "signals"
  | "source"
  | "savedAt"
  | "action";

interface Props {
  lead: Lead;
  searchId?: string;
  mode: "results" | "saved";
  savedAt?: string;
  visibleColumns: LeadTableColumnKey[];
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}

export function LeadRow({ lead, searchId, mode, savedAt, visibleColumns, selected, onSelectedChange }: Props) {
  const { isSaved, save, unsave } = useSavedLeads();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const saved = isSaved(lead.id);
  const websiteHref = getWebsiteHref(lead.website);
  const phoneHref = getPhoneHref(lead.phone);
  const mapHref = getMapHref(lead);

  const cell = (column: LeadTableColumnKey) => {
    switch (column) {
      case "business":
        return (
          <button type="button" onClick={() => setDetailsOpen(true)} aria-haspopup="dialog" aria-label={`View details for ${lead.businessName}`} className="group max-w-[220px] text-left">
            <span className="flex items-center gap-1 truncate font-medium text-slate-900 group-hover:text-slate-700">
              {lead.businessName}<ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </span>
            {mode === "results" && <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">{lead.businessType}</span>}
          </button>
        );
      case "type":
        return <span className="whitespace-nowrap text-slate-600">{lead.businessType}</span>;
      case "location":
        return mapHref ? (
          <a href={mapHref} target="_blank" rel="noopener noreferrer" aria-label={`Open ${lead.businessName} in Google Maps`} className="inline-flex max-w-[180px] items-center gap-1.5 truncate text-slate-600 hover:text-slate-900 hover:underline">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{lead.city}, {lead.country}</span><ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : <span className="text-slate-400">—</span>;
      case "website":
        return websiteHref ? (
          <a href={websiteHref} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${lead.businessName} website`} className="inline-flex max-w-[200px] items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline">
            <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{lead.website}</span><ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : <span className="text-slate-400">—</span>;
      case "phone":
        return phoneHref ? (
          <a href={phoneHref} aria-label={`Call ${lead.businessName} at ${lead.phone}`} className="inline-flex whitespace-nowrap items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />{lead.phone}
          </a>
        ) : <span className="text-slate-400">—</span>;
      case "email":
        return lead.email ? (
          <a href={`mailto:${lead.email}`} aria-label={`Email ${lead.businessName}`} className="inline-flex max-w-[200px] items-center gap-1.5 truncate text-slate-600 hover:text-slate-900 hover:underline">
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{lead.email}</span>
          </a>
        ) : <span className="text-slate-400">—</span>;
      case "rating":
        return lead.rating !== null ? (
          <span className="inline-flex whitespace-nowrap items-center gap-1 text-slate-700">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />{lead.rating}
            {lead.reviewCount !== null && <span className="text-xs text-slate-500">({lead.reviewCount})</span>}
          </span>
        ) : <span className="text-slate-400">—</span>;
      case "signals":
        return (
          <div className="flex min-w-[120px] flex-wrap gap-1">
            {lead.hasWebsite ? <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700"><Check className="h-3 w-3" />Website</span> : <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">No site</span>}
            {lead.hasPhone && <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700"><Check className="h-3 w-3" />Phone</span>}
            {lead.websiteQuality === "needs_improvement" && <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[11px] text-orange-700"><AlertTriangle className="h-3 w-3" />Site needs work</span>}
          </div>
        );
      case "source":
        return <span className="whitespace-nowrap text-slate-500">{lead.source}</span>;
      case "savedAt":
        return <span className="whitespace-nowrap text-slate-500">{savedAt ? formatRelative(savedAt) : "—"}</span>;
      case "action":
        return mode === "saved" ? (
          <button type="button" onClick={() => unsave(lead.id)} aria-label={`Unsave ${lead.businessName}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <BookmarkX className="h-3.5 w-3.5" />Unsave
          </button>
        ) : (
          <button type="button" aria-pressed={saved} onClick={() => saved ? unsave(lead.id) : searchId && save(lead.id, searchId)} aria-label={saved ? `Unsave ${lead.businessName}` : `Save ${lead.businessName}`} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors", saved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}{saved ? "Saved" : "Save"}
          </button>
        );
    }
  };

  return (
    <>
      <tr
        tabIndex={0}
        aria-selected={selected}
        onClick={(event) => { if ((event.target as HTMLElement).closest("a, button, input")) return; setDetailsOpen(true); }}
        onKeyDown={(event) => { if ((event.target as HTMLElement).closest("a, button, input")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetailsOpen(true); } }}
        className={cn("cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400", selected && "bg-slate-50")}
      >
        <td className="px-3 py-2.5">
          <input type="checkbox" aria-label={`Select ${lead.businessName}`} checked={selected} onChange={(event) => onSelectedChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-slate-800" />
        </td>
        {visibleColumns.map((column) => (
          <td key={column} className={cn("max-w-[240px] px-3 py-2.5 text-slate-700", column === "action" && "text-right")}>
            {cell(column)}
          </td>
        ))}
      </tr>
      {detailsOpen && <LeadDetailsDialog lead={lead} onClose={() => setDetailsOpen(false)} />}
    </>
  );
}
