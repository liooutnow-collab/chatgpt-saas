import type { Lead } from "@/lib/providers/types";

export function getWebsiteHref(website: string | null | undefined): string | null {
  const value = website?.trim();
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getPhoneHref(phone: string | null | undefined): string | null {
  const value = phone?.trim();
  if (!value) return null;

  const normalized = value.replace(/[^\d+*#;,]/g, "");
  return /\d/.test(normalized) ? `tel:${normalized}` : null;
}

export function getLeadAddress(lead: Pick<Lead, "address" | "city" | "country">): string {
  return [lead.address, lead.city, lead.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ");
}

export function getMapHref(
  lead: Pick<Lead, "latitude" | "longitude" | "address" | "city" | "country">
): string | null {
  const { latitude, longitude } = lead;
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const query = hasCoordinates ? `${latitude},${longitude}` : getLeadAddress(lead);
  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
