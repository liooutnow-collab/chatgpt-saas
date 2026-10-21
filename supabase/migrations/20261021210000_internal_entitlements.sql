-- Internal premium access for controlled product testing.
-- This table has no client grants. Access can only be provisioned with the
-- service-role-only function below, and quota is still reserved and settled.
create table if not exists private.internal_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  discovery_limit integer not null default 100000
    check (discovery_limit > 0 and discovery_limit <= 1000000),
  period_days integer not null default 30
    check (period_days between 1 and 365),
  display_name text not null default 'Internal Premium',
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.internal_entitlements enable row level security;
revoke all on table private.internal_entitlements from public, anon, authenticated, service_role;

insert into private.plan_entitlements (
  plan_code, discovery_limit, period_days, display_name, active
)
values ('internal', 100000, 30, 'Internal Premium', true)
on conflict (plan_code) do update
set discovery_limit = excluded.discovery_limit,
    period_days = excluded.period_days,
    display_name = excluded.display_name,
    active = excluded.active,
    updated_at = now();

create or replace function private.grant_internal_entitlement(
  p_user_id uuid,
  p_discovery_limit integer default 100000,
  p_period_days integer default 30,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = '22023';
  end if;
  insert into private.internal_entitlements (
    user_id, discovery_limit, period_days, expires_at, updated_at
  )
  values (
    p_user_id, p_discovery_limit, p_period_days, p_expires_at, now()
  )
  on conflict (user_id) do update
    set discovery_limit = excluded.discovery_limit,
        period_days = excluded.period_days,
        active = true,
        expires_at = excluded.expires_at,
        updated_at = now();
end;
$function$;

create or replace function private.revoke_internal_entitlement(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  update private.internal_entitlements
     set active = false, updated_at = now()
   where user_id = p_user_id;
end;
$function$;

revoke all on function private.grant_internal_entitlement(uuid, integer, integer, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function private.revoke_internal_entitlement(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.grant_internal_entitlement(uuid, integer, integer, timestamptz)
  to service_role;
grant execute on function private.revoke_internal_entitlement(uuid)
  to service_role;

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
  v_internal private.internal_entitlements%rowtype;
  v_desired_plan_code text;
  v_released integer := 0;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select * into v_plan
    from private.plan_entitlements as entitlement
   where entitlement.plan_code = 'free'
     and entitlement.active;
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

  select * into v_internal
    from private.internal_entitlements as entitlement
   where entitlement.user_id = v_user_id
     and entitlement.active
     and (entitlement.expires_at is null or entitlement.expires_at > v_now);

  if found then
    v_desired_plan_code := 'internal';
  elsif v_usage.plan_code = 'internal' then
    v_desired_plan_code := 'free';
  else
    v_desired_plan_code := v_usage.plan_code;
  end if;

  if v_desired_plan_code <> v_usage.plan_code then
    update private.discovery_reservations as reservation
       set status = 'released', settled_at = v_now
     where reservation.user_id = v_user_id
       and reservation.status = 'reserved'
       and reservation.period_started_at = v_usage.period_started_at;
    select * into v_plan
      from private.plan_entitlements as entitlement
     where entitlement.plan_code = v_desired_plan_code
       and entitlement.active;
    if not found then
      raise exception 'plan_not_configured' using errcode = 'P0001';
    end if;
    update private.user_discovery_usage as usage
       set plan_code = v_desired_plan_code,
           used_count = 0,
           reserved_count = 0,
           period_started_at = v_now,
           period_expires_at = v_now + (v_plan.period_days * interval '1 day'),
           updated_at = v_now
     where usage.user_id = v_user_id
    returning * into v_usage;
  end if;

  select * into v_plan
    from private.plan_entitlements as entitlement
   where entitlement.plan_code = v_usage.plan_code
     and entitlement.active;
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

revoke all on function private.prepare_discovery_usage() from public, anon, authenticated, service_role;
grant execute on function private.prepare_discovery_usage() to authenticated;
