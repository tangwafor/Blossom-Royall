create table public.readiness_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null default 'blossom-royall' check (tenant_slug ~ '^[a-z0-9-]{2,80}$'),
  store_id uuid references public.stores(id) on delete cascade,
  respondent_role text not null check (respondent_role in ('owner', 'vendor', 'prospect')),
  contact_email text check (contact_email is null or (contact_email = lower(contact_email) and length(contact_email) between 3 and 320)),
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 100000),
  consent_confirmed boolean not null check (consent_confirmed),
  status text not null default 'new' check (status in ('new', 'reviewing', 'complete', 'archived')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index readiness_submissions_tenant_status_idx on public.readiness_submissions (tenant_slug, status, submitted_at desc);

alter table public.readiness_submissions enable row level security;

create policy readiness_public_submit on public.readiness_submissions
for insert to anon, authenticated
with check (
  tenant_slug = 'blossom-royall'
  and store_id is null
  and consent_confirmed
  and status = 'new'
);

create policy readiness_store_read on public.readiness_submissions
for select to authenticated
using (store_id is not null and private.current_store_role(store_id) in ('owner', 'manager'));

create policy readiness_store_update on public.readiness_submissions
for update to authenticated
using (store_id is not null and private.current_store_role(store_id) in ('owner', 'manager'))
with check (store_id is not null and private.current_store_role(store_id) in ('owner', 'manager'));

create policy readiness_store_delete on public.readiness_submissions
for delete to authenticated
using (store_id is not null and private.current_store_role(store_id) = 'owner');

create or replace function private.audit_readiness_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    coalesce(new.store_id, old.store_id),
    lower(tg_op),
    'readiness_submission',
    coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger readiness_submissions_audit
after insert or update or delete on public.readiness_submissions
for each row execute function private.audit_readiness_submission();

grant insert on public.readiness_submissions to anon, authenticated;
grant select, update, delete on public.readiness_submissions to authenticated;
