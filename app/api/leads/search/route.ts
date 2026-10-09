import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { providerRouter } from "@/lib/providers/provider-router";
import { GeoapifyProviderError } from "@/lib/providers/geoapify-provider";
import type { Lead, LeadProviderSearchParams } from "@/lib/providers/types";
import { isAllowedResultCount, RESULT_COUNT_OPTIONS } from "@/lib/search/limits";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RequestBody = Partial<LeadProviderSearchParams> & { requestId?: unknown };
type QuotaRow = {
  allowed: boolean;
  duplicate: boolean;
  reserved_count: number;
  remaining_count: number;
};
type UsageRow = { remaining_count: number };

type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "USAGE_UNAVAILABLE"
  | "QUOTA_EXCEEDED"
  | "DUPLICATE_REQUEST"
  | "PROVIDER_ERROR"
  | "GEOCODING_ERROR"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_HTTP_ERROR"
  | "PROVIDER_MALFORMED_RESPONSE"
  | "PROVIDER_EMPTY_RESULT"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

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
    if (body.brief.priorities !== undefined && (!Array.isArray(body.brief.priorities) || body.brief.priorities.some((item) => typeof item !== "string" || item.length > 100))) {
      return "brief.priorities must be an array of short strings.";
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

async function releaseReservation(client: SupabaseClient, requestId: string) {
  try {
    await client.rpc("release_discovery_quota", { p_attempt_id: requestId });
  } catch {
    // Any abandoned lease is released by the database after 15 minutes.
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
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

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return errorResponse("USAGE_UNAVAILABLE", "Authentication is not configured.", 503);
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return errorResponse("UNAUTHENTICATED", "Please sign in before searching.", 401);
  }

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
    return errorResponse("DUPLICATE_REQUEST", "This search attempt was already submitted. Use Retry to start a new explicit attempt.", 409);
  }
  if (!reservation.allowed) {
    const available = Math.max(0, Number(reservation.remaining_count) || 0);
    return errorResponse("QUOTA_EXCEEDED", `This search requests ${requestedCount} discoveries, but you have ${available} remaining. Choose a smaller result count.`, 403);
  }

  const providerLimit = Number(reservation.reserved_count);
  if (!Number.isInteger(providerLimit) || providerLimit !== requestedCount) {
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

    const results = validUniqueResults(result.leads, providerLimit);
    const { data: settlementData, error: settlementError } = await supabase.rpc(
      "settle_discovery_quota",
      { p_attempt_id: requestId, p_actual_count: results.length }
    );
    const settlement = firstRow<UsageRow>(settlementData);
    if (settlementError || !settlement) {
      // Keep the hold until its 15-minute database lease expires. Releasing it
      // here would let a new retry spend provider credits without a reservation.
      return errorResponse("USAGE_UNAVAILABLE", "The search finished, but usage could not be recorded. Its quota is temporarily held to prevent a retry from bypassing the limit; check usage and try again later.", 503);
    }

    return NextResponse.json(
      {
        provider: result.provider,
        results,
        meta: {
          requestedCount,
          providerLimit,
          count: results.length,
          remaining: Number(settlement.remaining_count),
          offset: params.offset ?? 0,
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
    return errorResponse("PROVIDER_ERROR", "The lead provider could not complete this search.", 502);
  }
}
