create schema if not exists private;

create table if not exists private.user_discovery_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  used_count integer not null default 0 check (used_count between 0 and 100),
  reserved_count integer not null default 0 check (reserved_count between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_discovery_usage_lifetime_cap
    check (used_count + reserved_count <= 100)
);

create table if not exists private.discovery_reservations (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null,
  requested_count integer not null check (requested_count in (5, 10, 25, 50, 100)),
  reserved_count integer not null check (reserved_count between 5 and 100),
  actual_count integer not null default 0 check (actual_count between 0 and reserved_count),
  status text not null default 'reserved'
    check (status in ('reserved', 'settled', 'released')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  primary key (user_id, attempt_id)
);

create index if not exists discovery_reservations_active_by_user
  on private.discovery_reservations (user_id, status, created_at);

alter table private.user_discovery_usage enable row level security;
alter table private.discovery_reservations enable row level security;

revoke all on table private.user_discovery_usage
  from public, anon, authenticated, service_role;
revoke all on table private.discovery_reservations
  from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

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
  v_user_id uuid := auth.uid();
  v_usage private.user_discovery_usage%rowtype;
  v_released integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  insert into private.user_discovery_usage (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
    into v_usage
    from private.user_discovery_usage
   where user_id = v_user_id
   for update;

  with expired as (
    update private.discovery_reservations
       set status = 'released', settled_at = now()
     where user_id = v_user_id
       and status = 'reserved'
       and created_at < now() - interval '15 minutes'
     returning reserved_count
  )
  select coalesce(sum(expired.reserved_count), 0)::integer
    into v_released
    from expired;

  if v_released > 0 then
    update private.user_discovery_usage as usage
       set reserved_count = usage.reserved_count - v_released,
           updated_at = now()
     where user_id = v_user_id;
  end if;

  select *
    into v_usage
    from private.user_discovery_usage
   where user_id = v_user_id;

  return query
  select v_usage.used_count,
         v_usage.reserved_count,
         100 - v_usage.used_count - v_usage.reserved_count,
         100;
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

  -- This helper creates/locks the user's counter and releases expired leases.
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
  if v_available < 5 then
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

  v_reserved := least(p_requested_count, v_available);

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
    v_reserved
  );

  update private.user_discovery_usage as usage
     set reserved_count = usage.reserved_count + v_reserved,
         updated_at = now()
   where user_id = v_user_id
  returning * into v_usage;

  return query
  select true,
         false,
         'reserved'::text,
         p_requested_count,
         v_reserved,
         v_usage.used_count,
         v_usage.reserved_count,
         100 - v_usage.used_count - v_usage.reserved_count,
         100;
end;
$function$;

create or replace function private.settle_discovery_quota(
  p_attempt_id uuid,
  p_actual_count integer
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
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_attempt_id is null or p_actual_count is null or p_actual_count < 0 then
    raise exception 'invalid_settlement' using errcode = '22023';
  end if;

  perform * from private.get_discovery_usage();

  select *
    into v_usage
    from private.user_discovery_usage
   where user_id = v_user_id
   for update;

  select *
    into v_reservation
    from private.discovery_reservations
   where user_id = v_user_id
     and attempt_id = p_attempt_id
   for update;

  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0002';
  end if;

  if v_reservation.status = 'settled' then
    return query
    select v_usage.used_count,
           v_usage.reserved_count,
           100 - v_usage.used_count - v_usage.reserved_count,
           100;
    return;
  end if;

  if v_reservation.status <> 'reserved' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;

  if p_actual_count > v_reservation.reserved_count then
    raise exception 'settlement_exceeds_reservation' using errcode = '22023';
  end if;

  update private.user_discovery_usage as usage
     set used_count = usage.used_count + p_actual_count,
         reserved_count = usage.reserved_count - v_reservation.reserved_count,
         updated_at = now()
   where user_id = v_user_id
  returning * into v_usage;

  update private.discovery_reservations
     set status = 'settled',
         actual_count = p_actual_count,
         settled_at = now()
   where user_id = v_user_id
     and attempt_id = p_attempt_id;

  return query
  select v_usage.used_count,
         v_usage.reserved_count,
         100 - v_usage.used_count - v_usage.reserved_count,
         100;
end;
$function$;

create or replace function private.release_discovery_quota(p_attempt_id uuid)
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
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_attempt_id is null then
    raise exception 'attempt_id_required' using errcode = '22023';
  end if;

  perform * from private.get_discovery_usage();

  select *
    into v_usage
    from private.user_discovery_usage
   where user_id = v_user_id
   for update;

  select *
    into v_reservation
    from private.discovery_reservations
   where user_id = v_user_id
     and attempt_id = p_attempt_id
   for update;

  if found and v_reservation.status = 'reserved' then
    update private.user_discovery_usage as usage
       set reserved_count = usage.reserved_count - v_reservation.reserved_count,
           updated_at = now()
     where user_id = v_user_id
    returning * into v_usage;

    update private.discovery_reservations
       set status = 'released', settled_at = now()
     where user_id = v_user_id
       and attempt_id = p_attempt_id;
  end if;

  select *
    into v_usage
    from private.user_discovery_usage
   where user_id = v_user_id;

  return query
  select v_usage.used_count,
         v_usage.reserved_count,
         100 - v_usage.used_count - v_usage.reserved_count,
         100;
end;
$function$;

-- Expose only narrow, authenticated RPC wrappers. The privileged implementation stays
-- in the non-API `private` schema and binds every operation to auth.uid().
create or replace function public.get_discovery_usage()
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
  select * from private.get_discovery_usage();
$function$;

create or replace function public.reserve_discovery_quota(
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
language sql
security invoker
set search_path = ''
as $function$
  select * from private.reserve_discovery_quota(p_attempt_id, p_requested_count);
$function$;

create or replace function public.settle_discovery_quota(
  p_attempt_id uuid,
  p_actual_count integer
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
  select * from private.settle_discovery_quota(p_attempt_id, p_actual_count);
$function$;

create or replace function public.release_discovery_quota(p_attempt_id uuid)
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
  select * from private.release_discovery_quota(p_attempt_id);
$function$;

revoke all on function private.get_discovery_usage() from public, anon, authenticated, service_role;
revoke all on function private.reserve_discovery_quota(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function private.settle_discovery_quota(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function private.release_discovery_quota(uuid) from public, anon, authenticated, service_role;
grant execute on function private.get_discovery_usage() to authenticated;
grant execute on function private.reserve_discovery_quota(uuid, integer) to authenticated;
grant execute on function private.settle_discovery_quota(uuid, integer) to authenticated;
grant execute on function private.release_discovery_quota(uuid) to authenticated;

revoke all on function public.get_discovery_usage() from public, anon, authenticated, service_role;
revoke all on function public.reserve_discovery_quota(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.settle_discovery_quota(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.release_discovery_quota(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_discovery_usage() to authenticated;
grant execute on function public.reserve_discovery_quota(uuid, integer) to authenticated;
grant execute on function public.settle_discovery_quota(uuid, integer) to authenticated;
grant execute on function public.release_discovery_quota(uuid) to authenticated;
