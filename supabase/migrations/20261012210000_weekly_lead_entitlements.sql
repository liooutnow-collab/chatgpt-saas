-- L.I.O. weekly lead usage and future paid-plan entitlement foundation.
-- The existing reservation/idempotency tables are preserved; usage counters become
-- period-scoped and limits are read from private.plan_entitlements.
create table if not exists private.plan_entitlements (
  plan_code text primary key,
  discovery_limit integer not null check (discovery_limit > 0),
  period_days integer not null check (period_days > 0),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into private.plan_entitlements (plan_code, discovery_limit, period_days, display_name)
values
  ('free', 15, 7, 'Free Plan'),
  ('pro', 1000, 30, 'Pro Plan')
on conflict (plan_code) do nothing;

alter table private.plan_entitlements enable row level security;
revoke all on table private.plan_entitlements from public, anon, authenticated, service_role;

alter table private.user_discovery_usage
  add column if not exists plan_code text not null default 'free',
  add column if not exists period_started_at timestamptz,
  add column if not exists period_expires_at timestamptz;

alter table private.user_discovery_usage
  drop constraint if exists user_discovery_usage_lifetime_cap,
  drop constraint if exists user_discovery_usage_used_count_check,
  drop constraint if exists user_discovery_usage_reserved_count_check;

update private.user_discovery_usage
   set period_started_at = coalesce(period_started_at, created_at),
       period_expires_at = coalesce(period_expires_at, created_at + interval '7 days')
 where period_started_at is null or period_expires_at is null;

alter table private.user_discovery_usage
  alter column period_started_at set not null,
  alter column period_expires_at set not null;

alter table private.discovery_reservations
  add column if not exists period_started_at timestamptz not null default now();

create index if not exists discovery_reservations_period_idx
  on private.discovery_reservations (user_id, period_started_at, status);

create or replace function private.prepare_discovery_usage()
returns private.user_discovery_usage
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_usage private.user_discovery_usage%rowtype;
  v_plan private.plan_entitlements%rowtype;
  v_released integer := 0;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select * into v_plan
    from private.plan_entitlements
   where plan_code = 'free' and active;
  if not found then
    raise exception 'free_plan_not_configured' using errcode = 'P0001';
  end if;

  insert into private.user_discovery_usage (
    user_id, plan_code, period_started_at, period_expires_at
  )
  values (
    v_user_id, 'free', v_now, v_now + (v_plan.period_days * interval '1 day')
  )
  on conflict (user_id) do nothing;

  select * into v_usage
    from private.user_discovery_usage
   where user_id = v_user_id
   for update;

  select * into v_plan
    from private.plan_entitlements
   where plan_code = v_usage.plan_code and active;
  if not found then
    raise exception 'plan_not_configured' using errcode = 'P0001';
  end if;

  if v_usage.period_expires_at <= v_now then
    with expired as (
      update private.discovery_reservations as reservation
         set status = 'released', settled_at = v_now
       where reservation.user_id = v_user_id
         and reservation.status = 'reserved'
         and reservation.period_started_at = v_usage.period_started_at
       returning reservation.reserved_count
    )
    select coalesce(sum(expired.reserved_count), 0)::integer
      into v_released
      from expired;

    update private.user_discovery_usage as usage
       set used_count = 0,
           reserved_count = 0,
           period_started_at = v_now,
           period_expires_at = v_now + (v_plan.period_days * interval '1 day'),
           updated_at = v_now
     where usage.user_id = v_user_id
    returning * into v_usage;
  end if;

  return v_usage;
end;
$function$;

create or replace function private.get_discovery_usage()
returns table (
  used_count integer,
  reserved_count integer,
  remaining_count integer,
  lifetime_limit integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_usage private.user_discovery_usage%rowtype;
  v_plan_limit integer;
begin
  select * into v_usage from private.prepare_discovery_usage();
  select discovery_limit into v_plan_limit
    from private.plan_entitlements
   where plan_code = v_usage.plan_code and active;
  return query
  select v_usage.used_count,
         v_usage.reserved_count,
         greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count),
         v_plan_limit;
end;
$function$;

create or replace function private.get_discovery_usage_details()
returns table (
  used_count integer,
  reserved_count integer,
  remaining_count integer,
  plan_code text,
  plan_name text,
  period_started_at timestamptz,
  period_expires_at timestamptz,
  discovery_limit integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_usage private.user_discovery_usage%rowtype;
  v_plan private.plan_entitlements%rowtype;
begin
  select * into v_usage from private.prepare_discovery_usage();
  select * into v_plan
    from private.plan_entitlements
   where plan_code = v_usage.plan_code and active;
  return query
  select v_usage.used_count,
         v_usage.reserved_count,
         greatest(0, v_plan.discovery_limit - v_usage.used_count - v_usage.reserved_count),
         v_plan.plan_code,
         v_plan.display_name,
         v_usage.period_started_at,
         v_usage.period_expires_at,
         v_plan.discovery_limit;
end;
$function$;

create or replace function private.reserve_discovery_quota(
  p_attempt_id uuid,
  p_requested_count integer
)
returns table (
  allowed boolean,
  duplicate boolean,
  reservation_status text,
  requested_count integer,
  reserved_count integer,
  used_count integer,
  total_reserved integer,
  remaining_count integer,
  lifetime_limit integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_usage private.user_discovery_usage%rowtype;
  v_existing private.discovery_reservations%rowtype;
  v_plan_limit integer;
  v_available integer;
  v_reserved integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_attempt_id is null then
    raise exception 'attempt_id_required' using errcode = '22023';
  end if;
  if p_requested_count is null or p_requested_count not in (5, 10, 25, 50, 100) then
    raise exception 'invalid_requested_count' using errcode = '22023';
  end if;

  select * into v_usage from private.prepare_discovery_usage();
  select discovery_limit into v_plan_limit
    from private.plan_entitlements
   where plan_code = v_usage.plan_code and active;
  select * into v_existing
    from private.discovery_reservations
   where user_id = v_user_id and attempt_id = p_attempt_id
   for update;

  if found then
    if v_existing.status = 'released' then
      v_available := v_plan_limit - v_usage.used_count - v_usage.reserved_count;
      if v_available < 5 then
        return query select false, false, 'quota_exceeded'::text, p_requested_count, 0,
          v_usage.used_count, v_usage.reserved_count, greatest(0, v_available), v_plan_limit;
        return;
      end if;
      v_reserved := least(p_requested_count, v_available);
      update private.user_discovery_usage as usage
         set reserved_count = usage.reserved_count + v_reserved, updated_at = now()
       where user_id = v_user_id
      returning * into v_usage;
      update private.discovery_reservations
         set requested_count = p_requested_count, reserved_count = v_reserved,
             actual_count = 0, status = 'reserved', created_at = now(),
             period_started_at = v_usage.period_started_at, settled_at = null,
             result_payload = null
       where user_id = v_user_id and attempt_id = p_attempt_id;
      return query select true, false, 'reserved'::text, p_requested_count, v_reserved,
        v_usage.used_count, v_usage.reserved_count,
        greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count), v_plan_limit;
      return;
    end if;
    return query select false, true, v_existing.status, v_existing.requested_count,
      v_existing.reserved_count, v_usage.used_count, v_usage.reserved_count,
      greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count), v_plan_limit;
    return;
  end if;

  v_available := v_plan_limit - v_usage.used_count - v_usage.reserved_count;
  if v_available < 5 then
    return query select false, false, 'quota_exceeded'::text, p_requested_count, 0,
      v_usage.used_count, v_usage.reserved_count, greatest(0, v_available), v_plan_limit;
    return;
  end if;
  v_reserved := least(p_requested_count, v_available);
  insert into private.discovery_reservations (
    user_id, attempt_id, requested_count, reserved_count, period_started_at
  ) values (
    v_user_id, p_attempt_id, p_requested_count, v_reserved, v_usage.period_started_at
  );
  update private.user_discovery_usage as usage
     set reserved_count = usage.reserved_count + v_reserved, updated_at = now()
   where user_id = v_user_id
  returning * into v_usage;
  return query select true, false, 'reserved'::text, p_requested_count, v_reserved,
    v_usage.used_count, v_usage.reserved_count,
    greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count), v_plan_limit;
end;
$function$;

create or replace function private.settle_discovery_quota(
  p_attempt_id uuid,
  p_actual_count integer,
  p_result_payload jsonb
)
returns table (
  used_count integer,
  reserved_count integer,
  remaining_count integer,
  lifetime_limit integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_usage private.user_discovery_usage%rowtype;
  v_reservation private.discovery_reservations%rowtype;
  v_plan_limit integer;
  v_payload jsonb;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_attempt_id is null or p_actual_count is null or p_actual_count < 0 then
    raise exception 'invalid_settlement' using errcode = '22023';
  end if;
  if p_result_payload is null or jsonb_typeof(p_result_payload) is distinct from 'object'
     or jsonb_typeof(p_result_payload -> 'results') is distinct from 'array'
     or jsonb_typeof(p_result_payload -> 'meta') is distinct from 'object'
     or jsonb_typeof(p_result_payload -> 'idempotencyFingerprint') is distinct from 'string'
     or jsonb_array_length(p_result_payload -> 'results') <> p_actual_count then
    raise exception 'invalid_result_payload' using errcode = '22023';
  end if;

  select * into v_usage from private.prepare_discovery_usage();
  select discovery_limit into v_plan_limit from private.plan_entitlements
   where plan_code = v_usage.plan_code and active;
  select * into v_reservation from private.discovery_reservations
   where user_id = v_user_id and attempt_id = p_attempt_id for update;
  if not found then raise exception 'reservation_not_found' using errcode = 'P0002'; end if;
  if v_reservation.status = 'settled' then
    return query select v_usage.used_count, v_usage.reserved_count,
      greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count), v_plan_limit;
    return;
  end if;
  if v_reservation.status <> 'reserved' then raise exception 'reservation_not_active' using errcode = 'P0001'; end if;
  if p_actual_count > v_reservation.reserved_count then raise exception 'settlement_exceeds_reservation' using errcode = '22023'; end if;

  update private.user_discovery_usage as usage
     set used_count = usage.used_count + p_actual_count,
         reserved_count = usage.reserved_count - v_reservation.reserved_count,
         updated_at = now()
   where user_id = v_user_id
  returning * into v_usage;
  update private.discovery_reservations
     set status = 'settled', actual_count = p_actual_count, settled_at = now()
   where user_id = v_user_id and attempt_id = p_attempt_id;
  v_payload := jsonb_set(p_result_payload, '{meta,remaining}',
    to_jsonb(greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count)), true);
  update private.discovery_reservations
     set result_payload = coalesce(result_payload, v_payload)
   where user_id = v_user_id and attempt_id = p_attempt_id and status = 'settled';
  return query select v_usage.used_count, v_usage.reserved_count,
    greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count), v_plan_limit;
end;
$function$;

-- Keep the existing release function's signature and make it period-aware.
create or replace function private.release_discovery_quota(p_attempt_id uuid)
returns table (used_count integer, reserved_count integer, remaining_count integer, lifetime_limit integer)
language plpgsql security definer set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_usage private.user_discovery_usage%rowtype;
  v_reservation private.discovery_reservations%rowtype;
  v_plan_limit integer;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_attempt_id is null then raise exception 'attempt_id_required' using errcode = '22023'; end if;
  select * into v_usage from private.prepare_discovery_usage();
  select discovery_limit into v_plan_limit from private.plan_entitlements
   where plan_code = v_usage.plan_code and active;
  select * into v_reservation from private.discovery_reservations
   where user_id = v_user_id and attempt_id = p_attempt_id for update;
  if found and v_reservation.status = 'reserved' then
    update private.user_discovery_usage
       set reserved_count = reserved_count - v_reservation.reserved_count, updated_at = now()
     where user_id = v_user_id
    returning * into v_usage;
    update private.discovery_reservations set status = 'released', settled_at = now()
     where user_id = v_user_id and attempt_id = p_attempt_id;
  end if;
  return query select v_usage.used_count, v_usage.reserved_count,
    greatest(0, v_plan_limit - v_usage.used_count - v_usage.reserved_count), v_plan_limit;
end;
$function$;

create or replace function public.get_discovery_usage_details()
returns table (used_count integer, reserved_count integer, remaining_count integer, plan_code text,
  plan_name text, period_started_at timestamptz, period_expires_at timestamptz, discovery_limit integer)
language sql security invoker set search_path = ''
as $function$ select * from private.get_discovery_usage_details(); $function$;

revoke all on function private.prepare_discovery_usage() from public, anon, authenticated, service_role;
revoke all on function private.get_discovery_usage_details() from public, anon, authenticated, service_role;
revoke all on function public.get_discovery_usage_details() from public, anon, authenticated, service_role;
grant execute on function private.prepare_discovery_usage() to authenticated;
grant execute on function private.get_discovery_usage_details() to authenticated;
grant execute on function public.get_discovery_usage_details() to authenticated;
