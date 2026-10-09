"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  Star,
  X,
} from "lucide-react";
import type { Lead } from "@/lib/providers/types";
import {
  getLeadAddress,
  getMapHref,
  getPhoneHref,
  getWebsiteHref,
} from "@/lib/contact-links";

interface Props {
  lead: Lead;
  onClose: () => void;
}

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadContact(lead: Lead, websiteHref: string | null, address: string) {
  const fields = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(lead.businessName)}`,
    `ORG:${escapeVCard(lead.businessName)}`,
    lead.phone ? `TEL;TYPE=WORK,VOICE:${escapeVCard(lead.phone)}` : "",
    websiteHref ? `URL:${escapeVCard(websiteHref)}` : "",
    address ? `ADR;TYPE=WORK:;;${escapeVCard(address)}` : "",
    "END:VCARD",
  ].filter(Boolean);

  const blob = new Blob([fields.join("\r\n")], { type: "text/vcard;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename =
    lead.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "business-contact";
  link.href = objectUrl;
  link.download = `${filename}.vcf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function LeadDetailsDialog({ lead, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const websiteHref = getWebsiteHref(lead.website);
  const phoneHref = getPhoneHref(lead.phone);
  const mapHref = getMapHref(lead);
  const address = getLeadAddress(lead);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";

    const getFocusableElements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    getFocusableElements()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-details-title"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Business details</p>
            <h2 id="lead-details-title" className="mt-1 text-xl font-medium tracking-tight text-slate-900">
              {lead.businessName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{lead.businessType}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close business details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {lead.rating !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                {lead.rating}
                {lead.reviewCount !== null ? ` · ${lead.reviewCount} reviews` : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
              <Building2 className="h-4 w-4 text-slate-400" />
              {lead.source}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50"
              >
                <Globe className="h-5 w-5 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-slate-500">Website</span>
                  <span className="block truncate text-sm font-medium text-slate-800">{lead.website}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-700" />
              </a>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-400">No website listed</div>
            )}

            {phoneHref ? (
              <a
                href={phoneHref}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50"
                aria-label={`Call ${lead.businessName} at ${lead.phone}`}
              >
                <Phone className="h-5 w-5 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-slate-500">Phone</span>
                  <span className="block truncate text-sm font-medium text-slate-800">{lead.phone}</span>
                </span>
              </a>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-400">No phone number listed</div>
            )}

            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 sm:col-span-2"
              >
                <MapPin className="h-5 w-5 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-slate-500">Location</span>
                  <span className="block text-sm font-medium text-slate-800">{address || `${lead.latitude}, ${lead.longitude}`}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-600">
                  Open map <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-400 sm:col-span-2">No location listed</div>
            )}
          </div>

          {phoneHref && (
            <div className="rounded-xl bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => downloadContact(lead, websiteHref, address)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Download className="h-4 w-4" />
                Add to contacts
              </button>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Downloads a contact card you can save in your phone&apos;s contacts.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <CheckCircle2 className="h-4 w-4" />
            Listing details provided by {lead.source}.
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
