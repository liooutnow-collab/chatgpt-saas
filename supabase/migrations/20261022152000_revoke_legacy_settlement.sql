-- The application uses the payload-bearing settlement function. Remove
-- authenticated access to the older overload so it cannot bypass payload
-- validation or the zero-settlement guard.
revoke all on function public.settle_discovery_quota(uuid, integer)
  from public, anon, authenticated, service_role;
