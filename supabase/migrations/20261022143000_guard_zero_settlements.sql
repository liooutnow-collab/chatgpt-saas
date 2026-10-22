-- Prevent the directly callable authenticated settlement wrapper from being
-- used as a zero-cost quota bypass. Empty provider searches are released by
-- the server route through release_discovery_quota instead.
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
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_actual_count is null or p_actual_count < 1 then
    raise exception 'zero_settlement_not_allowed' using errcode = '22023';
  end if;

  return query
  select * from private.settle_discovery_quota(
    p_attempt_id,
    p_actual_count,
    p_result_payload
  );
end;
$function$;

revoke all on function public.settle_discovery_quota(uuid, integer, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.settle_discovery_quota(uuid, integer, jsonb)
  to authenticated;
