begin;

create table public.vendor_storefronts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  public_name text not null check (length(public_name) between 1 and 120),
  owner_display_name text check (owner_display_name is null or length(owner_display_name) <= 120),
  tagline text check (tagline is null or length(tagline) <= 180),
  story text check (story is null or length(story) <= 4000),
  categories text[] not null default '{}',
  facebook_url text check (facebook_url is null or facebook_url ~ '^https://'),
  website_url text check (website_url is null or website_url ~ '^https://'),
  contact_email text check (contact_email is null or contact_email = lower(contact_email)),
  contact_phone text,
  primary_color text not null default '#5a1830' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#f1d49d' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  fulfillment_methods text[] not null default '{}',
  media_rights_status text not null default 'pending' check (media_rights_status in ('pending', 'confirmed', 'restricted')),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'suspended')),
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id),
  unique (store_id, slug),
  check (private.vendor_store(vendor_id) = store_id),
  check ((status = 'published' and published_at is not null) or (status <> 'published' and published_at is null))
);

create index vendor_storefronts_store_status_idx
on public.vendor_storefronts (store_id, status, updated_at desc);

alter table public.vendor_storefronts enable row level security;

create policy vendor_storefronts_read on public.vendor_storefronts
for select to authenticated
using (
  private.current_store_role(store_id) is not null
  or private.owns_vendor(vendor_id)
);

create policy vendor_storefronts_insert on public.vendor_storefronts
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and (
    private.current_store_role(store_id) in ('owner', 'manager')
    or private.owns_vendor(vendor_id)
  )
);

create policy vendor_storefronts_update on public.vendor_storefronts
for update to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager')
  or private.owns_vendor(vendor_id)
)
with check (
  updated_by = (select auth.uid())
  and (
    private.current_store_role(store_id) in ('owner', 'manager')
    or private.owns_vendor(vendor_id)
  )
);

create policy vendor_storefronts_delete on public.vendor_storefronts
for delete to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager')
  or private.owns_vendor(vendor_id)
);

grant select, insert, update, delete on public.vendor_storefronts to authenticated;

create or replace function private.audit_vendor_storefront_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (
    actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'vendor_storefront',
    coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_vendor_storefront_write() from public, anon, authenticated;

create trigger vendor_storefronts_audit
after insert or update or delete on public.vendor_storefronts
for each row execute function private.audit_vendor_storefront_write();

commit;
