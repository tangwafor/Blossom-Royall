create or replace function private.current_store_role(requested_store_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select membership.role
  from public.store_memberships as membership
  where membership.store_id = requested_store_id
    and membership.user_id = (select auth.uid())
    and (
      membership.role <> 'owner'::public.app_role
      or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    )
$$;

revoke all on function private.current_store_role(uuid) from public, anon;
grant execute on function private.current_store_role(uuid) to authenticated;

comment on function private.current_store_role(uuid) is
  'Returns tenant membership role. Owner authority requires an aal2 session.';
