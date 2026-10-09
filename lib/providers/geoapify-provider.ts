import {
  Lead,
  LeadProvider,
  LeadProviderSearchParams,
} from "./types";

const GEOAPIFY_GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";
const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";
const SEARCH_RADIUS_METERS = 25_000;

interface GeoapifyGeocodeResult {
  lat?: number;
  lon?: number;
  formatted?: string;
  city?: string;
  country?: string;
  country_code?: string;
  place_id?: string;
}

interface GeoapifyPlaceProperties {
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  country?: string;
  country_code?: string;
  lat?: number;
  lon?: number;
  place_id?: string;
  website?: string;
  phone?: string;
  email?: string;
  categories?: string[];
  datasource?: {
    raw?: Record<string, unknown>;
  };
  rank?: {
    confidence?: number;
  };
}

interface GeoapifyPlacesResponse {
  features?: Array<{
    properties?: GeoapifyPlaceProperties;
  }>;
}

export class GeoapifyProviderError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly statusCode: 422 | 429 | 502 = 502,
    public readonly code:
      | "GEOCODING_ERROR"
      | "PROVIDER_AUTH_ERROR"
      | "PROVIDER_RATE_LIMIT"
      | "PROVIDER_HTTP_ERROR"
      | "PROVIDER_MALFORMED_RESPONSE"
      | "PROVIDER_EMPTY_RESULT"
      | "NETWORK_ERROR"
      | "INTERNAL_ERROR" = "PROVIDER_HTTP_ERROR"
  ) {
    super(publicMessage);
    this.name = "GeoapifyProviderError";
  }
}

const CATEGORY_MAP: Record<string, string> = {
  dentist: "healthcare.dentist",
  restaurant: "catering.restaurant",
  gym: "sport.fitness",
  cafe: "catering.cafe",
  "coffee shop": "catering.cafe",
  hotel: "accommodation.hotel",
  // Geoapify exposes estate agencies under both office and service. The
  // former commercial.real_estate value is not a valid Places category.
  "real estate agency": "office.estate_agent,service.estate_agent",
  plumber: "service.plumber",
  lawyer: "service.lawyer",
};

function categoryFor(businessType: string): string {
  const normalized = businessType.trim().toLowerCase().replace(/\s+/g, " ");
  return CATEGORY_MAP[normalized] ?? "commercial";
}

function labelFor(businessType: string): string {
  const normalized = businessType.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "custom" ? "Business" : businessType;
}

function stringValue(...values: unknown[]): string | null {
  const value = values.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );
  return value ? value.trim() : null;
}

function numberValue(...values: unknown[]): number | null {
  const value = values.find(
    (candidate): candidate is number =>
      typeof candidate === "number" && Number.isFinite(candidate)
  );
  return value ?? null;
}

function normalizeWebsite(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

function normalizeLead(
  properties: GeoapifyPlaceProperties,
  requestedBusinessType: string,
  location: GeoapifyGeocodeResult
): Lead | null {
  const latitude = numberValue(properties.lat);
  const longitude = numberValue(properties.lon);
  if (latitude === null || longitude === null) return null;

  const raw = properties.datasource?.raw ?? {};
  const website = normalizeWebsite(
    stringValue(properties.website, raw.website, raw["contact:website"])
  );
  const phone = stringValue(
    properties.phone,
    raw.phone,
    raw["contact:phone"],
    raw["contact:mobile"]
  );
  const email = stringValue(properties.email, raw.email, raw["contact:email"]);
  const name = stringValue(
    properties.name,
    properties.address_line1,
    properties.formatted
  );
  if (!name) return null;

  const address = stringValue(
    properties.formatted,
    [properties.housenumber, properties.street]
      .filter(Boolean)
      .join(" "),
    properties.address_line1
  );
  const city = stringValue(properties.city, location.city);
  const country = stringValue(properties.country, location.country);
  const sourceId = stringValue(
    properties.place_id,
    raw.osm_id,
    raw.place_id,
    `${latitude}:${longitude}:${name}`
  );

  return {
    id: `geoapify_${sourceId}`,
    businessName: name,
    businessType: labelFor(requestedBusinessType),
    website,
    phone,
    ...(email ? { email } : {}),
    address: address ?? "",
    city: city ?? "",
    country: country ?? "",
    source: "Geoapify",
    sourceId: sourceId ?? `geoapify_${latitude}_${longitude}`,
    latitude,
    longitude,
    hasWebsite: Boolean(website),
    hasPhone: Boolean(phone),
    rating: null,
    reviewCount: null,
    websiteQuality: website ? "unknown" : "unknown",
  };
}

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
    throw new GeoapifyProviderError(
      "The lead provider could not be reached. Please try again.",
      502,
      "NETWORK_ERROR"
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new GeoapifyProviderError(
      "The lead provider is not configured correctly.",
      502,
      "PROVIDER_AUTH_ERROR"
    );
  }
  if (response.status === 429) {
    throw new GeoapifyProviderError(
      "The lead provider rate limit was reached. Please try again later.",
      429,
      "PROVIDER_RATE_LIMIT"
    );
  }
  if (!response.ok) {
    throw new GeoapifyProviderError(
      "The lead provider returned an error. Please try again.",
      502,
      "PROVIDER_HTTP_ERROR"
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new GeoapifyProviderError(
      "The lead provider returned an invalid response.",
      502,
      "PROVIDER_MALFORMED_RESPONSE"
    );
  }
}

export class GeoapifyProvider implements LeadProvider {
  getName(): string {
    return "Geoapify";
  }

  async search(params: LeadProviderSearchParams, signal?: AbortSignal): Promise<Lead[]> {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      throw new GeoapifyProviderError(
        "The Geoapify provider is not configured.",
        502,
        "PROVIDER_AUTH_ERROR"
      );
    }

    const startedAt = Date.now();
    const geocodeUrl = new URL(GEOAPIFY_GEOCODE_URL);
    geocodeUrl.searchParams.set("text", params.location);
    geocodeUrl.searchParams.set("type", "locality");
    geocodeUrl.searchParams.set("limit", "1");
    geocodeUrl.searchParams.set("format", "json");
    geocodeUrl.searchParams.set("apiKey", apiKey);

    const geocode = await fetchJson<{ results?: GeoapifyGeocodeResult[] }>(
      geocodeUrl,
      signal
    );
    const location = geocode.results?.[0];
    if (!location || typeof location.lat !== "number" || typeof location.lon !== "number") {
      throw new GeoapifyProviderError(
        "We could not find that location. Try a city and country.",
        422,
        "GEOCODING_ERROR"
      );
    }

    const placesUrl = new URL(GEOAPIFY_PLACES_URL);
    placesUrl.searchParams.set("categories", categoryFor(params.businessType));
    placesUrl.searchParams.set(
      "filter",
      `circle:${location.lon},${location.lat},${SEARCH_RADIUS_METERS}`
    );
    placesUrl.searchParams.set(
      "bias",
      `proximity:${location.lon},${location.lat}`
    );
    placesUrl.searchParams.set("limit", String(params.limit));
    placesUrl.searchParams.set("offset", String(params.offset ?? 0));
    placesUrl.searchParams.set("lang", "en");
    placesUrl.searchParams.set("apiKey", apiKey);

    const places = await fetchJson<GeoapifyPlacesResponse>(placesUrl, signal);
    const seen = new Set<string>();
    const leads: Lead[] = [];

    for (const feature of places.features ?? []) {
      const lead = feature.properties
        ? normalizeLead(feature.properties, params.businessType, location)
        : null;
      if (!lead || seen.has(lead.sourceId)) continue;
      seen.add(lead.sourceId);
      leads.push(lead);
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[LeadProvider] Geoapify search", {
        provider: this.getName(),
        businessType: params.businessType,
        location: params.location,
        limit: params.limit,
        resultCount: leads.length,
        durationMs: Date.now() - startedAt,
      });
    }

    return leads;
  }
}

export const geoapifyProvider = new GeoapifyProvider();
