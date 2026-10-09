-- The RETURNS TABLE output variable reserved_count conflicted with the
-- unqualified RETURNING column in the expired-reservation cleanup CTE.
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
    update private.discovery_reservations as reservation
       set status = 'released', settled_at = now()
     where reservation.user_id = v_user_id
       and reservation.status = 'reserved'
       and reservation.created_at < now() - interval '15 minutes'
     returning reservation.reserved_count
  )
  select coalesce(sum(expired.reserved_count), 0)::integer
    into v_released
    from expired;

  if v_released > 0 then
    update private.user_discovery_usage as usage
       set reserved_count = usage.reserved_count - v_released,
           updated_at = now()
     where usage.user_id = v_user_id;
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
