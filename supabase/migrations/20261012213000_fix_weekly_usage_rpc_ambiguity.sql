-- Qualify plan_entitlements columns because RETURNS TABLE exposes a plan_code
-- output variable that otherwise conflicts with the source column name.
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
    from private.plan_entitlements as entitlement
   where entitlement.plan_code = v_usage.plan_code
     and entitlement.active;
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
