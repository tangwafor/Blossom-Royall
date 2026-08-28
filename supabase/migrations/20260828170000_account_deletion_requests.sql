begin;

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'canceled', 'completed', 'blocked_legal_retention')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default (now() + interval '7 days'),
  canceled_at timestamptz,
  completed_at timestamptz,
  retention_summary jsonb not null default '{"transaction_records":"Anonymized records may be retained where required for tax, fraud, dispute, or legal obligations."}'::jsonb,
  unique (user_id),
  check ((status = 'canceled') = (canceled_at is not null)),
  check ((status = 'completed') = (completed_at is not null))
);

alter table public.account_deletion_requests enable row level security;

create policy account_deletion_requests_read_self on public.account_deletion_requests
for select to authenticated using (user_id = (select auth.uid()));
create policy account_deletion_requests_insert_self on public.account_deletion_requests
for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
create policy account_deletion_requests_update_self on public.account_deletion_requests
for update to authenticated
using (user_id = (select auth.uid()) and status in ('pending', 'canceled'))
with check (user_id = (select auth.uid()) and status in ('pending', 'canceled'));
create policy account_deletion_requests_delete_self on public.account_deletion_requests
for delete to authenticated using (user_id = (select auth.uid()) and status = 'canceled');

grant select, insert, update, delete on public.account_deletion_requests to authenticated;

create or replace function public.request_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  sole_owner_store uuid;
  result public.account_deletion_requests;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  select membership.store_id into sole_owner_store
  from public.store_memberships membership
  where membership.user_id = caller_id and membership.role = 'owner'
    and not exists (
      select 1 from public.store_memberships another
      where another.store_id = membership.store_id and another.role = 'owner' and another.user_id <> caller_id
    )
  limit 1;
  if sole_owner_store is not null then raise exception 'transfer_store_ownership_required'; end if;

  insert into public.account_deletion_requests (user_id, status, requested_at, scheduled_for, canceled_at, completed_at)
  values (caller_id, 'pending', now(), now() + interval '7 days', null, null)
  on conflict (user_id) do update set status = 'pending', requested_at = now(), scheduled_for = now() + interval '7 days', canceled_at = null, completed_at = null
  returning * into result;

  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, (select store_id from public.store_memberships where user_id = caller_id limit 1), 'request', 'account_deletion_request', result.id::text, to_jsonb(result));
  return result;
end;
$$;

create or replace function public.cancel_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  result public.account_deletion_requests;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  update public.account_deletion_requests set status = 'canceled', canceled_at = now(), completed_at = null
  where user_id = caller_id and status = 'pending' returning * into result;
  if result.id is null then raise exception 'pending_deletion_request_not_found'; end if;
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, (select store_id from public.store_memberships where user_id = caller_id limit 1), 'cancel', 'account_deletion_request', result.id::text, to_jsonb(result));
  return result;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

commit;
