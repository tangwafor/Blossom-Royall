begin;

create table public.store_operating_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  public_name text not null,
  legal_name text not null default '',
  owner_display_name text not null default '',
  operating_address text not null default '',
  receipt_phone text not null default '',
  receipt_email text not null default '',
  locale text not null default 'en-US',
  timezone text not null default 'America/New_York',
  order_prefix text not null default 'BR',
  retail_policy jsonb not null default '{}'::jsonb,
  commerce_controls jsonb not null default '{}'::jsonb,
  delivery_controls jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_operating_public_name_present check (length(trim(public_name)) between 1 and 120),
  constraint store_operating_legal_name_length check (length(legal_name) <= 180),
  constraint store_operating_owner_name_length check (length(owner_display_name) <= 120),
  constraint store_operating_address_length check (length(operating_address) <= 500),
  constraint store_operating_phone_length check (length(receipt_phone) <= 40),
  constraint store_operating_email_valid check (receipt_email = '' or receipt_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint store_operating_locale_present check (length(trim(locale)) between 2 and 35),
  constraint store_operating_timezone_present check (length(trim(timezone)) between 3 and 80),
  constraint store_operating_order_prefix_valid check (order_prefix ~ '^[A-Z0-9]{2,8}$'),
  constraint store_operating_policy_object check (jsonb_typeof(retail_policy) = 'object'),
  constraint store_operating_commerce_object check (jsonb_typeof(commerce_controls) = 'object'),
  constraint store_operating_delivery_object check (jsonb_typeof(delivery_controls) = 'object')
);

alter table public.store_operating_settings enable row level security;

create policy store_operating_settings_read on public.store_operating_settings for select to authenticated
using (private.current_store_role(store_id) is not null);

create policy store_operating_settings_create on public.store_operating_settings for insert to authenticated
with check (
  private.current_store_role(store_id) in ('owner', 'manager')
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

create policy store_operating_settings_update on public.store_operating_settings for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'))
with check (
  private.current_store_role(store_id) in ('owner', 'manager')
  and updated_by = auth.uid()
);

create policy store_operating_settings_remove on public.store_operating_settings for delete to authenticated
using (private.current_store_role(store_id) = 'owner');

grant select, insert, update, delete on public.store_operating_settings to authenticated;

create or replace function private.audit_store_operating_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'store_operating_settings',
    coalesce(new.store_id, old.store_id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_store_operating_settings() from public, anon, authenticated;

create trigger store_operating_settings_audit
after insert or update or delete on public.store_operating_settings
for each row execute function private.audit_store_operating_settings();

commit;
