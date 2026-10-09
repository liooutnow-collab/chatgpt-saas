"use client";

import { useState } from "react";
import type { Lead } from "@/lib/providers/types";
import { useSavedLeads } from "@/lib/hooks/use-saved-leads";
import {
  ArrowUpRight,
  Globe,
  Phone,
  MapPin,
  Star,
  Bookmark,
  BookmarkCheck,
  Check,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMapHref, getPhoneHref, getWebsiteHref } from "@/lib/contact-links";
import { LeadDetailsDialog } from "./LeadDetailsDialog";

interface Props {
  lead: Lead;
  searchId: string;
}

export function LeadRow({ lead, searchId }: Props) {
  const { isSaved, save, unsave } = useSavedLeads();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const saved = isSaved(lead.id);
  const websiteHref = getWebsiteHref(lead.website);
  const phoneHref = getPhoneHref(lead.phone);
  const mapHref = getMapHref(lead);

  return (
    <>
      <tr
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) return;
          setDetailsOpen(true);
        }}
        className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/60"
      >
        <td className="py-3.5 px-4">
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-haspopup="dialog"
            className="group text-left"
          >
            <span className="flex items-center gap-1 font-medium text-slate-900 group-hover:text-slate-700">
              {lead.businessName}
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">{lead.businessType} · View details</span>
          </button>
        </td>
        <td className="py-3.5 px-4 hidden md:table-cell">
          <div className="space-y-1.5 text-sm">
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 max-w-[220px] items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline"
                aria-label={`Visit ${lead.businessName} website`}
              >
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{lead.website}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Globe className="h-3.5 w-3.5" /> No website
              </span>
            )}
            {phoneHref ? (
              <a
                href={phoneHref}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline"
                aria-label={`Call ${lead.businessName} at ${lead.phone}`}
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {lead.phone}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Phone className="h-3.5 w-3.5" /> No phone
              </span>
            )}
          </div>
        </td>
        <td className="py-3.5 px-4 hidden lg:table-cell">
          {mapHref ? (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-[200px] items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 hover:underline"
              aria-label={`Open ${lead.businessName} in Google Maps`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{lead.city}, {lead.country}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin className="h-3.5 w-3.5" /> No location
            </span>
          )}
        </td>
        <td className="py-3.5 px-4 hidden sm:table-cell">
          <div className="flex flex-wrap gap-1.5">
            {lead.hasWebsite ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
                <Check className="h-3 w-3" /> Website
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                No site
              </span>
            )}
            {lead.hasPhone && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
                <Check className="h-3 w-3" /> Phone
              </span>
            )}
            {lead.rating !== null && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {lead.rating}
              </span>
            )}
            {lead.websiteQuality === "needs_improvement" && (
              <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[11px] text-orange-700">
                <AlertTriangle className="h-3 w-3" /> Site needs work
              </span>
            )}
          </div>
        </td>
        <td className="py-3.5 px-4 text-right">
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => (saved ? unsave(lead.id) : save(lead.id, searchId))}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              saved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            {saved ? "Saved" : "Save"}
          </button>
        </td>
      </tr>
      {detailsOpen && <LeadDetailsDialog lead={lead} onClose={() => setDetailsOpen(false)} />}
    </>
  );
}
