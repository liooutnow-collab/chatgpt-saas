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

  v_reserved := p_requested_count;

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
