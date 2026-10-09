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

export function LeadCard({ lead, searchId }: Props) {
  const { isSaved, save, unsave } = useSavedLeads();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const saved = isSaved(lead.id);
  const websiteHref = getWebsiteHref(lead.website);
  const phoneHref = getPhoneHref(lead.phone);
  const mapHref = getMapHref(lead);

  return (
    <>
      <article
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) return;
          setDetailsOpen(true);
        }}
        className="cursor-pointer space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              aria-haspopup="dialog"
              className="group text-left"
            >
              <span className="flex items-center gap-1 font-medium text-slate-900 group-hover:text-slate-700">
                <span className="truncate">{lead.businessName}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </span>
            </button>
            <p className="mt-0.5 text-xs text-slate-500">{lead.businessType}</p>
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="mt-1 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
            >
              View details
            </button>
          </div>
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => (saved ? unsave(lead.id) : save(lead.id, searchId))}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium",
              saved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>

        <div className="space-y-1.5 text-sm text-slate-600">
          {websiteHref ? (
            <div className="flex min-w-0 items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-1 truncate hover:text-slate-900 hover:underline"
                aria-label={`Visit ${lead.businessName} website`}
              >
                <span className="truncate">{lead.website}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Globe className="h-3.5 w-3.5" />
              <span>No website listed</span>
            </div>
          )}
          {phoneHref ? (
            <a
              href={phoneHref}
              className="flex items-center gap-2 hover:text-slate-900 hover:underline"
              aria-label={`Call ${lead.businessName} at ${lead.phone}`}
            >
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {lead.phone}
            </a>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              <span>No phone number listed</span>
            </div>
          )}
          {mapHref ? (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 hover:text-slate-900 hover:underline"
              aria-label={`Open ${lead.businessName} in Google Maps`}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{lead.city}, {lead.country}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              <span>No location listed</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {lead.hasWebsite && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
              <Check className="h-3 w-3" /> Website
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
              {lead.reviewCount ? ` (${lead.reviewCount})` : ""}
            </span>
          )}
          {lead.websiteQuality === "needs_improvement" && (
            <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[11px] text-orange-700">
              <AlertTriangle className="h-3 w-3" /> Needs improvement
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-400">Source: {lead.source}</div>
      </article>
      {detailsOpen && <LeadDetailsDialog lead={lead} onClose={() => setDetailsOpen(false)} />}
    </>
  );
}
