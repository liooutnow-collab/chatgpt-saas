alter table private.discovery_reservations
  add column if not exists result_payload jsonb;

-- A failed/released reservation may be retried with the same idempotency key.
-- Settled and currently-reserved keys remain duplicates and are never charged twice.
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
  v_available integer;
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

  perform * from private.get_discovery_usage();

  select *
    into v_usage
    from private.user_discovery_usage
   where user_id = v_user_id
   for update;

  select *
    into v_existing
    from private.discovery_reservations
   where user_id = v_user_id
     and attempt_id = p_attempt_id
   for update;

  if found then
    if v_existing.status = 'released' then
      v_available := 100 - v_usage.used_count - v_usage.reserved_count;
      if v_available < p_requested_count then
        return query
        select false,
               false,
               'quota_exceeded'::text,
               p_requested_count,
               0,
               v_usage.used_count,
               v_usage.reserved_count,
               greatest(0, v_available),
               100;
        return;
      end if;

      update private.user_discovery_usage as usage
         set reserved_count = usage.reserved_count + p_requested_count,
             updated_at = now()
       where user_id = v_user_id
      returning * into v_usage;

      update private.discovery_reservations
         set requested_count = p_requested_count,
             reserved_count = p_requested_count,
             actual_count = 0,
             status = 'reserved',
             created_at = now(),
             settled_at = null,
             result_payload = null
       where user_id = v_user_id
         and attempt_id = p_attempt_id;

      return query
      select true,
             false,
             'reserved'::text,
             p_requested_count,
             p_requested_count,
             v_usage.used_count,
             v_usage.reserved_count,
             100 - v_usage.used_count - v_usage.reserved_count,
             100;
      return;
    end if;

    return query
    select false,
           true,
           v_existing.status,
           v_existing.requested_count,
           v_existing.reserved_count,
           v_usage.used_count,
           v_usage.reserved_count,
           100 - v_usage.used_count - v_usage.reserved_count,
           100;
    return;
  end if;

  v_available := 100 - v_usage.used_count - v_usage.reserved_count;
  if v_available < p_requested_count then
    return query
    select false,
           false,
           'quota_exceeded'::text,
           p_requested_count,
           0,
           v_usage.used_count,
           v_usage.reserved_count,
           greatest(0, v_available),
           100;
    return;
  end if;

  insert into private.discovery_reservations (
    user_id,
    attempt_id,
    requested_count,
    reserved_count
  )
  values (
    v_user_id,
    p_attempt_id,
    p_requested_count,
    p_requested_count
  );

  update private.user_discovery_usage as usage
     set reserved_count = usage.reserved_count + p_requested_count,
         updated_at = now()
   where user_id = v_user_id
  returning * into v_usage;

  return query
  select true,
         false,
         'reserved'::text,
         p_requested_count,
         p_requested_count,
         v_usage.used_count,
         v_usage.reserved_count,
         100 - v_usage.used_count - v_usage.reserved_count,
         100;
end;
$function$;

create or replace function private.get_discovery_result(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_attempt_id is null then
    raise exception 'attempt_id_required' using errcode = '22023';
  end if;

  select reservation.result_payload
    into v_result
    from private.discovery_reservations as reservation
   where reservation.user_id = v_user_id
     and reservation.attempt_id = p_attempt_id
     and reservation.status = 'settled';

  return v_result;
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
  v_used_count integer;
  v_reserved_count integer;
  v_remaining_count integer;
  v_lifetime_limit integer;
  v_payload jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_result_payload is null
     or jsonb_typeof(p_result_payload) is distinct from 'object'
     or jsonb_typeof(p_result_payload -> 'results') is distinct from 'array'
     or jsonb_typeof(p_result_payload -> 'meta') is distinct from 'object'
     or jsonb_typeof(p_result_payload -> 'idempotencyFingerprint') is distinct from 'string' then
    raise exception 'invalid_result_payload' using errcode = '22023';
  end if;
  if jsonb_array_length(p_result_payload -> 'results') <> p_actual_count then
    raise exception 'result_count_mismatch' using errcode = '22023';
  end if;

  select usage.used_count,
         usage.reserved_count,
         usage.remaining_count,
         usage.lifetime_limit
    into v_used_count,
         v_reserved_count,
         v_remaining_count,
         v_lifetime_limit
    from private.settle_discovery_quota(p_attempt_id, p_actual_count) as usage;

  v_payload := jsonb_set(
    p_result_payload,
    '{meta,remaining}',
    to_jsonb(v_remaining_count),
    true
  );

  update private.discovery_reservations as reservation
     set result_payload = coalesce(reservation.result_payload, v_payload)
   where reservation.user_id = v_user_id
     and reservation.attempt_id = p_attempt_id
     and reservation.status = 'settled';

  if not found then
    raise exception 'settled_reservation_not_found' using errcode = 'P0002';
  end if;

  return query
  select v_used_count,
         v_reserved_count,
         v_remaining_count,
         v_lifetime_limit;
end;
$function$;

create or replace function public.get_discovery_result(p_attempt_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.get_discovery_result(p_attempt_id);
$function$;

create or replace function public.settle_discovery_quota(
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
language sql
security invoker
set search_path = ''
as $function$
  select * from private.settle_discovery_quota(p_attempt_id, p_actual_count, p_result_payload);
$function$;

revoke all on function private.reserve_discovery_quota(uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function private.get_discovery_result(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.settle_discovery_quota(uuid, integer, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.get_discovery_result(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.settle_discovery_quota(uuid, integer, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function private.reserve_discovery_quota(uuid, integer) to authenticated;
grant execute on function private.get_discovery_result(uuid) to authenticated;
grant execute on function private.settle_discovery_quota(uuid, integer, jsonb) to authenticated;
grant execute on function public.get_discovery_result(uuid) to authenticated;
grant execute on function public.settle_discovery_quota(uuid, integer, jsonb) to authenticated;
