import { Lead } from "@/lib/providers/types";

export type FormatterFieldId =
  | "businessName"
  | "businessType"
  | "email"
  | "phone"
  | "website"
  | "address"
  | "city"
  | "country"
  | "latitude"
  | "longitude"
  | "rating"
  | "reviewCount"
  | "websiteQuality"
  | "source"
  | "sourceId";

export type FormatterCategory =
  | "Business"
  | "Contact"
  | "Location"
  | "Business Information"
  | "Source";

export interface FormatterField {
  id: FormatterFieldId;
  label: string;
  category: FormatterCategory;
  description?: string;
  getValue: (lead: Lead) => unknown;
}

export const FORMATTER_FIELDS: FormatterField[] = [
  { id: "businessName", label: "Business Name", category: "Business", getValue: (lead) => lead.businessName },
  { id: "businessType", label: "Business Type", category: "Business", getValue: (lead) => lead.businessType },
  { id: "email", label: "Email", category: "Contact", getValue: (lead) => lead.email },
  { id: "phone", label: "Phone", category: "Contact", getValue: (lead) => lead.phone },
  { id: "website", label: "Website", category: "Contact", getValue: (lead) => lead.website },
  { id: "address", label: "Address", category: "Location", getValue: (lead) => lead.address },
  { id: "city", label: "City", category: "Location", getValue: (lead) => lead.city },
  { id: "country", label: "Country", category: "Location", getValue: (lead) => lead.country },
  { id: "latitude", label: "Latitude", category: "Location", getValue: (lead) => lead.latitude },
  { id: "longitude", label: "Longitude", category: "Location", getValue: (lead) => lead.longitude },
  { id: "rating", label: "Rating", category: "Business Information", getValue: (lead) => lead.rating },
  { id: "reviewCount", label: "Review Count", category: "Business Information", getValue: (lead) => lead.reviewCount },
  { id: "websiteQuality", label: "Website Quality", category: "Business Information", getValue: (lead) => lead.websiteQuality },
  { id: "source", label: "Source", category: "Source", description: "The provider that supplied the lead.", getValue: (lead) => lead.source },
  { id: "sourceId", label: "Source ID", category: "Source", description: "The provider's lead reference.", getValue: (lead) => lead.sourceId },
];

export const FORMATTER_PRESETS = {
  "Contact List": ["businessName", "email", "phone", "website"],
  "Location List": ["businessName", "address", "city", "country"],
  "Full Lead": [
    "businessName", "businessType", "website", "email", "phone", "address",
    "city", "country", "rating", "reviewCount", "websiteQuality",
  ],
} satisfies Record<string, FormatterFieldId[]>;

export type FormatterPreset = keyof typeof FORMATTER_PRESETS | "Custom";

export function getFormatterField(id: FormatterFieldId) {
  return FORMATTER_FIELDS.find((field) => field.id === id);
}

export function dedupeLeads(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = lead.source && lead.sourceId
      ? `${lead.source}:${lead.sourceId}`
      : lead.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function displayFormatterValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function exportFormatterValue(value: unknown): string | number {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "number" ? value : String(value);
}

export function createFormattedRows(leads: Lead[], fieldIds: FormatterFieldId[]) {
  const fields = fieldIds.map(getFormatterField).filter(Boolean) as FormatterField[];
  return dedupeLeads(leads).map((lead) =>
    fields.reduce<Record<string, string | number>>((row, field) => {
      row[field.label] = exportFormatterValue(field.getValue(lead));
      return row;
    }, {})
  );
}

export function sanitizeExportPart(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "results";
}

export function createExportFilename(businessType: string, location: string, extension: "csv" | "xlsx") {
  return `${sanitizeExportPart(businessType)}-${sanitizeExportPart(location)}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}
