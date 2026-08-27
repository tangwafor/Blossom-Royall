begin;

create type product_media_status as enum ('draft', 'published', 'archived');

create table product_media (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  original_file_name text not null check (length(original_file_name) between 1 and 255),
  storage_path text not null unique check (storage_path = store_id::text || '/' || product_id::text || '/' || id::text || '/' || original_file_name),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 10000000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  width_px integer not null check (width_px > 0),
  height_px integer not null check (height_px > 0),
  alt_text text not null check (length(alt_text) between 1 and 500),
  sort_order integer not null default 0 check (sort_order >= 0),
  status product_media_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create index product_media_store_id_idx on product_media(store_id);
create index product_media_product_id_idx on product_media(product_id);
create index product_media_uploaded_by_idx on product_media(uploaded_by);
create index product_media_store_status_idx on product_media(store_id, status, created_at desc);

alter table product_media enable row level security;

create policy product_media_read on product_media for select to authenticated
using (private.current_store_role(store_id) is not null);

create policy product_media_insert on product_media for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and store_id = private.product_store(product_id)
  and (
    private.current_store_role(store_id) in ('owner', 'manager')
    or exists (select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id))
  )
);

create policy product_media_update on product_media for update to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager')
  or exists (select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id))
)
with check (
  store_id = private.product_store(product_id)
  and (
    private.current_store_role(store_id) in ('owner', 'manager')
    or exists (select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id))
  )
);

create policy product_media_delete on product_media for delete to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager')
  or exists (select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', false, 10000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy product_media_storage_read on storage.objects for select to authenticated
using (
  bucket_id = 'product-media'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) is not null
);

create policy product_media_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-media'
  and owner_id = (select auth.uid())::text
  and private.current_store_role(((storage.foldername(name))[1])::uuid) is not null
  and private.product_store(((storage.foldername(name))[2])::uuid) = ((storage.foldername(name))[1])::uuid
);

create policy product_media_storage_update on storage.objects for update to authenticated
using (
  bucket_id = 'product-media'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) is not null
)
with check (
  bucket_id = 'product-media'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) is not null
);

create policy product_media_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'product-media'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) is not null
);

create or replace function private.audit_product_media()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into audit_log(actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values ((select auth.uid()), coalesce(new.store_id, old.store_id), tg_op, 'product_media', coalesce(new.id, old.id)::text, to_jsonb(old), to_jsonb(new));
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_product_media() from public, anon, authenticated;

create trigger product_media_audit
after insert or update or delete on product_media
for each row execute function private.audit_product_media();

commit;
