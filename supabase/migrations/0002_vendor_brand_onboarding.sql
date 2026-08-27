begin;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type vendor_brand_asset_status as enum ('submitted', 'approved', 'rejected', 'superseded');

create table vendor_brand_assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  contact_email text not null check (contact_email = lower(contact_email) and length(contact_email) between 3 and 320),
  original_file_name text not null check (length(original_file_name) between 1 and 255),
  storage_path text not null unique check (storage_path = store_id::text || '/' || vendor_id::text || '/' || id::text || '/' || original_file_name),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')),
  byte_size integer not null check (byte_size between 1 and 5000000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  rights_confirmed boolean not null default false check (rights_confirmed),
  rights_confirmed_at timestamptz not null default now(),
  status vendor_brand_asset_status not null default 'submitted',
  version integer not null check (version > 0),
  is_current boolean not null default false,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  review_note text check (review_note is null or length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, version),
  check ((status = 'submitted' and reviewed_by is null and reviewed_at is null) or (status <> 'submitted' and reviewed_by is not null and reviewed_at is not null)),
  check (not is_current or status = 'approved')
);

create unique index vendor_brand_assets_one_current_per_vendor
on vendor_brand_assets(vendor_id)
where is_current;

create index vendor_brand_assets_review_queue
on vendor_brand_assets(store_id, status, created_at desc);

alter table profiles enable row level security;
alter table stores enable row level security;
alter table store_memberships enable row level security;
alter table vendors enable row level security;
alter table vendor_brand_assets enable row level security;
alter table audit_log enable row level security;

create or replace function private.current_store_role(requested_store_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from store_memberships
  where store_id = requested_store_id and user_id = auth.uid()
$$;

revoke all on function private.current_store_role(uuid) from public, anon;
grant execute on function private.current_store_role(uuid) to authenticated;

create policy profiles_read_self on profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy stores_read_member on stores for select to authenticated using (private.current_store_role(id) is not null);
create policy memberships_read_store on store_memberships for select to authenticated using (user_id = auth.uid() or private.current_store_role(store_id) in ('owner', 'manager'));
create policy vendors_read_store on vendors for select to authenticated using (private.current_store_role(store_id) is not null);
create policy vendors_manage_store on vendors for all to authenticated using (private.current_store_role(store_id) in ('owner', 'manager')) with check (private.current_store_role(store_id) in ('owner', 'manager'));

create policy brand_assets_read on vendor_brand_assets for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager')
  or uploaded_by = auth.uid()
  or exists (select 1 from vendors where vendors.id = vendor_id and vendors.owner_user_id = auth.uid())
);

create policy brand_assets_submit on vendor_brand_assets for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and status = 'submitted'
  and not is_current
  and (
    private.current_store_role(store_id) in ('owner', 'manager')
    or exists (select 1 from vendors where vendors.id = vendor_id and vendors.store_id = store_id and vendors.owner_user_id = auth.uid())
  )
);

create policy brand_assets_owner_update on vendor_brand_assets for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'))
with check (private.current_store_role(store_id) in ('owner', 'manager'));

create policy audit_read_owner on audit_log for select to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vendor-brand-assets', 'vendor-brand-assets', false, 5000000, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy vendor_brand_storage_read on storage.objects for select to authenticated
using (
  bucket_id = 'vendor-brand-assets'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) is not null
);

create policy vendor_brand_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'vendor-brand-assets'
  and owner_id = auth.uid()::text
  and private.current_store_role(((storage.foldername(name))[1])::uuid) is not null
);

create or replace function private.audit_vendor_brand_asset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log(actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), coalesce(new.store_id, old.store_id), tg_op, 'vendor_brand_asset', coalesce(new.id, old.id)::text, to_jsonb(old), to_jsonb(new));
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_vendor_brand_asset() from public, anon, authenticated;

create trigger vendor_brand_asset_audit
after insert or update or delete on vendor_brand_assets
for each row execute function private.audit_vendor_brand_asset();

commit;
