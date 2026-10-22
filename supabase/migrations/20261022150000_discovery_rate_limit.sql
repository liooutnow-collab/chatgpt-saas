-- Database-enforced abuse control for lead discovery reservations.
-- This trigger covers both the Next.js API route and direct authenticated RPC
-- calls, unlike an in-memory serverless limiter.
create table if not exists private.discovery_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table private.discovery_rate_limits enable row level security;
revoke all on table private.discovery_rate_limits from public, anon, authenticated, service_role;

create or replace function private.enforce_discovery_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := now();
  v_limit constant integer := 30;
  v_window constant interval := interval '1 minute';
  v_row private.discovery_rate_limits%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or new.user_id <> v_user_id then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  insert into private.discovery_rate_limits (user_id, window_started_at, request_count, updated_at)
  values (v_user_id, v_now, 1, v_now)
  on conflict (user_id) do nothing;

  select * into v_row
    from private.discovery_rate_limits
   where user_id = v_user_id
   for update;

  if v_row.window_started_at <= v_now - v_window then
    update private.discovery_rate_limits
       set window_started_at = v_now,
           request_count = 1,
           updated_at = v_now
     where user_id = v_user_id;
  elsif v_row.request_count >= v_limit then
    raise exception 'discovery_rate_limit_exceeded' using errcode = 'P0001';
  else
    update private.discovery_rate_limits
       set request_count = request_count + 1,
           updated_at = v_now
     where user_id = v_user_id;
  end if;

  return new;
end;
$function$;

 drop trigger if exists discovery_reservation_rate_limit on private.discovery_reservations;
 create trigger discovery_reservation_rate_limit
   before insert or update of status on private.discovery_reservations
   for each row
   when (new.status = 'reserved')
   execute function private.enforce_discovery_rate_limit();

revoke all on function private.enforce_discovery_rate_limit() from public, anon, authenticated, service_role;
