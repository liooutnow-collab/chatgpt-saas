import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { providerRouter } from "@/lib/providers/provider-router";
import { GeoapifyProviderError } from "@/lib/providers/geoapify-provider";
import type { Lead, LeadProviderSearchParams } from "@/lib/providers/types";
import { isAllowedResultCount, RESULT_COUNT_OPTIONS } from "@/lib/search/limits";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PUBLIC_DATA_SOURCE_LABEL } from "@/lib/providers/public";

type RequestBody = Partial<LeadProviderSearchParams> & { requestId?: unknown };
type QuotaRow = {
  allowed: boolean;
  duplicate: boolean;
  reservation_status: string;
  reserved_count: number;
  remaining_count: number;
};
type UsageRow = { remaining_count: number };
type UsageDetailsRow = { period_expires_at?: string };
type CachedSearchResponse = {
  provider: string;
  results: Lead[];
  meta: {
    requestedCount: number;
    providerLimit: number;
    count: number;
    remaining: number;
    offset: number;
  };
  idempotencyFingerprint: string;
};

type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "USAGE_UNAVAILABLE"
  | "QUOTA_EXCEEDED"
  | "DUPLICATE_REQUEST"
  | "DUPLICATE_RESULT_UNAVAILABLE"
  | "PROVIDER_ERROR"
  | "GEOCODING_ERROR"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_HTTP_ERROR"
  | "PROVIDER_MALFORMED_RESPONSE"
  | "PROVIDER_EMPTY_RESULT"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

const MAX_REQUEST_BODY_BYTES = 16 * 1024;
const MAX_BRIEF_PRIORITIES = 4;

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("The request body exceeds the allowed size.");
    this.name = "RequestBodyTooLargeError";
  }
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function errorResponse(code: ErrorCode, message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

function isRequestBody(value: unknown): value is RequestBody {
  return typeof value === "object" && value !== null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateRequest(body: RequestBody): string | null {
  if (!isUuid(body.requestId)) return "requestId must be a valid UUID.";
  if (
    typeof body.businessType !== "string" ||
    body.businessType.trim().length < 1 ||
    body.businessType.trim().length > 100
  ) {
    return "businessType must be a non-empty string no longer than 100 characters.";
  }
  if (
    typeof body.location !== "string" ||
    body.location.trim().length < 1 ||
    body.location.trim().length > 200
  ) {
    return "location must be a non-empty string no longer than 200 characters.";
  }
  if (!isAllowedResultCount(body.limit)) {
    return `limit must be one of ${RESULT_COUNT_OPTIONS.join(", ")}.`;
  }
  if (
    body.offset !== undefined &&
    (typeof body.offset !== "number" || !Number.isInteger(body.offset) || body.offset < 0)
  ) {
    return "offset must be a non-negative integer when provided.";
  }
  if (body.brief !== undefined) {
    if (typeof body.brief !== "object" || body.brief === null) {
      return "brief must be an object when provided.";
    }
    if (
      body.brief.resultCount !== undefined &&
      (!isAllowedResultCount(body.brief.resultCount) || body.brief.resultCount !== body.limit)
    ) {
      return "brief.resultCount must match limit and use an allowed result count.";
    }
    if (body.brief.goal !== undefined && (typeof body.brief.goal !== "string" || body.brief.goal.length > 300)) {
      return "brief.goal must be a string no longer than 300 characters.";
    }
    if (body.brief.additionalInstruction !== undefined && (typeof body.brief.additionalInstruction !== "string" || body.brief.additionalInstruction.length > 1000)) {
      return "brief.additionalInstruction must be a string no longer than 1000 characters.";
    }
    if (body.brief.priorities !== undefined && (!Array.isArray(body.brief.priorities) || body.brief.priorities.length > MAX_BRIEF_PRIORITIES || body.brief.priorities.some((item) => typeof item !== "string" || item.length > 100))) {
      return `brief.priorities must be an array of up to ${MAX_BRIEF_PRIORITIES} short strings.`;
    }
    if (body.brief.qualificationStyle !== undefined && !["broad", "balanced", "strict"].includes(body.brief.qualificationStyle)) {
      return "brief.qualificationStyle is invalid.";
    }
  }
  return null;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === "object") return data as T;
  return null;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function fingerprintRequest(params: LeadProviderSearchParams): string {
  const canonical = canonicalJson({
    businessType: params.businessType,
    location: params.location,
    limit: params.limit,
    offset: params.offset ?? 0,
    brief: params.brief ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

function isCachedSearchResponse(value: unknown): value is CachedSearchResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Partial<CachedSearchResponse>;
  return typeof payload.provider === "string" &&
    Array.isArray(payload.results) &&
    typeof payload.idempotencyFingerprint === "string" &&
    Boolean(payload.meta && typeof payload.meta === "object");
}

function validUniqueResults(leads: Lead[], maximum: number): Lead[] {
  const results: Lead[] = [];
  const seen = new Set<string>();
  for (const lead of leads) {
    if (
      !lead ||
      typeof lead.id !== "string" ||
      !lead.id.trim() ||
      typeof lead.sourceId !== "string" ||
      !lead.sourceId.trim() ||
      typeof lead.businessName !== "string" ||
      !lead.businessName.trim() ||
      !Number.isFinite(lead.latitude) ||
      !Number.isFinite(lead.longitude)
    ) {
      continue;
    }
    const key = lead.sourceId.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(lead);
    if (results.length >= maximum) break;
  }
  return results;
}

function publicizeLead(lead: Lead): Lead {
  const sourceId = lead.sourceId.startsWith("lio_")
    ? lead.sourceId
    : `lio_${createHash("sha256").update(lead.sourceId).digest("hex").slice(0, 24)}`;
  const id = lead.id.startsWith("lead_public_")
    ? lead.id
    : `lead_public_${createHash("sha256").update(`${lead.sourceId}:${lead.businessName}`).digest("hex").slice(0, 24)}`;
  return {
    ...lead,
    id,
    source: PUBLIC_DATA_SOURCE_LABEL,
    sourceId,
  };
}

function publicizeResults(leads: Lead[]): Lead[] {
  return leads.map(publicizeLead);
}

async function releaseReservation(client: SupabaseClient, requestId: string) {
  try {
    await client.rpc("release_discovery_quota", { p_attempt_id: requestId });
  } catch {
    // Any abandoned lease is released by the database after 15 minutes.
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return errorResponse("USAGE_UNAVAILABLE", "Authentication is not configured.", 503);
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return errorResponse("UNAUTHENTICATED", "Please sign in before searching.", 401);
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return errorResponse("INVALID_REQUEST", "Request body must not exceed 16 KiB.", 413);
    }
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }
  if (!isRequestBody(body)) {
    return errorResponse("INVALID_REQUEST", "Request body must be a JSON object.", 400);
  }

  const validationError = validateRequest(body);
  if (validationError) return errorResponse("INVALID_REQUEST", validationError, 400);

  const requestId = body.requestId as string;
  const requestedCount = body.limit as number;
  const params: LeadProviderSearchParams = {
    businessType: body.businessType!.trim(),
    location: body.location!.trim(),
    limit: requestedCount,
    offset: body.offset,
    brief: body.brief,
  };
  const idempotencyFingerprint = fingerprintRequest(params);

  const { data: reservationData, error: reservationError } = await supabase.rpc(
    "reserve_discovery_quota",
    { p_attempt_id: requestId, p_requested_count: requestedCount }
  );
  if (reservationError) {
    return errorResponse("USAGE_UNAVAILABLE", "The discovery allowance could not be reserved.", 503);
  }
  const reservation = firstRow<QuotaRow>(reservationData);
  if (!reservation) {
    return errorResponse("USAGE_UNAVAILABLE", "The discovery allowance could not be reserved.", 503);
  }
  if (reservation.duplicate) {
    if (reservation.reservation_status === "settled") {
      const { data: cachedData, error: cacheError } = await supabase.rpc(
        "get_discovery_result",
        { p_attempt_id: requestId }
      );
      if (cacheError) {
        return errorResponse("USAGE_UNAVAILABLE", "The previous search result could not be restored. Please retry shortly.", 503);
      }
      if (isCachedSearchResponse(cachedData)) {
        if (cachedData.idempotencyFingerprint !== idempotencyFingerprint) {
          return errorResponse("DUPLICATE_REQUEST", "This attempt ID belongs to a different search. Start a new attempt.", 409);
        }
        return NextResponse.json({
          provider: PUBLIC_DATA_SOURCE_LABEL,
          results: publicizeResults(cachedData.results),
          meta: cachedData.meta,
        }, {
          headers: { "Cache-Control": "no-store, max-age=0" },
        });
      }
      return errorResponse("DUPLICATE_RESULT_UNAVAILABLE", "This earlier attempt has no stored result. Retry to start a fresh search attempt.", 409);
    }
    return errorResponse("DUPLICATE_REQUEST", "This search attempt was already submitted. Use Retry to start a new explicit attempt.", 409);
  }
  if (!reservation.allowed) {
    const available = Math.max(0, Number(reservation.remaining_count) || 0);
    return errorResponse("QUOTA_EXCEEDED", `This search requests ${requestedCount} discoveries, but you have ${available} remaining. Choose a smaller result count.`, 403);
  }

  const providerLimit = Number(reservation.reserved_count);
  if (!Number.isInteger(providerLimit) || providerLimit < 5 || providerLimit > requestedCount) {
    await releaseReservation(supabase, requestId);
    return errorResponse("USAGE_UNAVAILABLE", "The discovery allowance reservation was invalid.", 503);
  }

  try {
    const result = await providerRouter.search(
      { ...params, limit: providerLimit },
      request.signal
    );

    if (request.signal.aborted) {
      await releaseReservation(supabase, requestId);
      return new Response(null, { status: 499 });
    }

    const results = publicizeResults(validUniqueResults(result.leads, providerLimit));
    const storedResponse: CachedSearchResponse = {
      provider: PUBLIC_DATA_SOURCE_LABEL,
      results,
      meta: {
        requestedCount,
        providerLimit,
        count: results.length,
        remaining: 0,
        offset: params.offset ?? 0,
      },
      idempotencyFingerprint,
    };
    const { data: settlementData, error: settlementError } = await supabase.rpc(
      "settle_discovery_quota",
      {
        p_attempt_id: requestId,
        p_actual_count: results.length,
        p_result_payload: storedResponse,
      }
    );
    const settlement = firstRow<UsageRow>(settlementData);
    if (settlementError || !settlement) {
      // Keep the hold until its 15-minute database lease expires. Releasing it
      // here would let a new retry spend provider credits without a reservation.
      return errorResponse("USAGE_UNAVAILABLE", "The search finished, but usage could not be recorded. Its quota is temporarily held to prevent a retry from bypassing the limit; check usage and try again later.", 503);
    }

    const { data: detailsData } = await supabase.rpc("get_discovery_usage_details");
    const usageDetails = firstRow<UsageDetailsRow>(detailsData);

    return NextResponse.json(
      {
        provider: storedResponse.provider,
        results: storedResponse.results,
        meta: {
          ...storedResponse.meta,
          remaining: Number(settlement.remaining_count),
          resetAt: usageDetails?.period_expires_at ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    await releaseReservation(supabase, requestId);
    if (request.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      return new Response(null, { status: 499 });
    }
    if (error instanceof GeoapifyProviderError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[LeadProvider] request failed", {
          category: error.code,
          statusCode: error.statusCode,
        });
      }
      return errorResponse(error.code, error.publicMessage, error.statusCode);
    }
    return errorResponse("PROVIDER_ERROR", "The business directory could not complete this search.", 502);
  }
}
