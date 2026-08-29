begin;

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  location text not null default '',
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_registers_name_present check (length(trim(name)) between 1 and 80),
  constraint cash_registers_location_length check (length(location) <= 160),
  unique (store_id, name)
);

create table public.cash_drawer_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  register_id uuid not null references public.cash_registers(id) on delete restrict,
  opened_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  status text not null default 'open',
  opening_float numeric(12, 2) not null,
  expected_cash numeric(12, 2),
  counted_cash numeric(12, 2),
  variance numeric(12, 2),
  opening_note text not null default '',
  closing_note text not null default '',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint cash_drawer_sessions_status_valid check (status in ('open', 'closed')),
  constraint cash_drawer_sessions_opening_valid check (opening_float >= 0),
  constraint cash_drawer_sessions_closing_valid check (
    (status = 'open' and expected_cash is null and counted_cash is null and variance is null and closed_by is null and closed_at is null)
    or
    (status = 'closed' and expected_cash is not null and counted_cash >= 0 and variance = counted_cash - expected_cash and closed_at is not null)
  ),
  constraint cash_drawer_sessions_note_length check (length(opening_note) <= 500 and length(closing_note) <= 500)
);

create unique index cash_drawer_one_open_register_idx
on public.cash_drawer_sessions(register_id)
where status = 'open';

create unique index cash_drawer_one_open_cashier_idx
on public.cash_drawer_sessions(store_id, opened_by)
where status = 'open' and opened_by is not null;

create index cash_drawer_sessions_store_opened_idx
on public.cash_drawer_sessions(store_id, opened_at desc);

create table public.cash_drawer_adjustments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id uuid not null references public.cash_drawer_sessions(id) on delete restrict,
  adjustment_type text not null,
  amount numeric(12, 2) not null,
  reason text not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  constraint cash_drawer_adjustments_type_valid check (adjustment_type in ('paid_in', 'paid_out')),
  constraint cash_drawer_adjustments_amount_valid check (amount > 0),
  constraint cash_drawer_adjustments_reason_present check (length(trim(reason)) between 3 and 240)
);

create index cash_drawer_adjustments_session_idx
on public.cash_drawer_adjustments(session_id, recorded_at);

alter table public.payments
  add column drawer_session_id uuid references public.cash_drawer_sessions(id) on delete restrict;

create index payments_drawer_session_idx
on public.payments(drawer_session_id, received_at)
where method = 'cash';

alter table public.cash_registers enable row level security;
alter table public.cash_drawer_sessions enable row level security;
alter table public.cash_drawer_adjustments enable row level security;

create policy cash_registers_read on public.cash_registers for select to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager', 'staff'));
create policy cash_registers_create on public.cash_registers for insert to authenticated
with check (private.current_store_role(store_id) in ('owner', 'manager') and created_by = auth.uid() and updated_by = auth.uid());
create policy cash_registers_update on public.cash_registers for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'))
with check (private.current_store_role(store_id) in ('owner', 'manager') and updated_by = auth.uid());
create policy cash_registers_remove on public.cash_registers for delete to authenticated
using (private.current_store_role(store_id) = 'owner');

create policy cash_drawer_sessions_read on public.cash_drawer_sessions for select to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager', 'staff'));
create policy cash_drawer_sessions_remove_unused on public.cash_drawer_sessions for delete to authenticated
using (private.current_store_role(store_id) = 'owner' and status = 'open');

create policy cash_drawer_adjustments_read on public.cash_drawer_adjustments for select to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager', 'staff'));
create policy cash_drawer_adjustments_remove on public.cash_drawer_adjustments for delete to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager') and exists (
  select 1 from public.cash_drawer_sessions session
  where session.id = session_id and session.status = 'open'
));

create or replace function private.audit_cash_operations()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_store uuid := coalesce(new.store_id, old.store_id);
begin
  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), target_store, lower(tg_op), tg_table_name,
    coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_cash_operations() from public, anon, authenticated;

create trigger cash_registers_audit after insert or update or delete on public.cash_registers
for each row execute function private.audit_cash_operations();
create trigger cash_drawer_sessions_audit after insert or update or delete on public.cash_drawer_sessions
for each row execute function private.audit_cash_operations();
create trigger cash_drawer_adjustments_audit after insert or update or delete on public.cash_drawer_adjustments
for each row execute function private.audit_cash_operations();

create or replace function public.open_cash_drawer(
  p_store_id uuid,
  p_register_id uuid,
  p_opening_float numeric,
  p_note text default ''
)
returns public.cash_drawer_sessions
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  result public.cash_drawer_sessions;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  if private.current_store_role(p_store_id) not in ('owner', 'manager', 'staff') then raise exception 'cash_drawer_access_denied'; end if;
  if p_opening_float is null or p_opening_float < 0 then raise exception 'invalid_opening_float'; end if;
  if length(coalesce(p_note, '')) > 500 then raise exception 'drawer_note_too_long'; end if;
  if not exists (select 1 from public.cash_registers where id = p_register_id and store_id = p_store_id and active) then
    raise exception 'active_register_required';
  end if;
  insert into public.cash_drawer_sessions(store_id, register_id, opened_by, opening_float, opening_note)
  values (p_store_id, p_register_id, caller_id, p_opening_float, trim(coalesce(p_note, '')))
  returning * into result;
  return result;
exception when unique_violation then
  raise exception 'register_already_open';
end;
$$;

create or replace function public.record_cash_drawer_adjustment(
  p_session_id uuid,
  p_adjustment_type text,
  p_amount numeric,
  p_reason text
)
returns public.cash_drawer_adjustments
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  drawer public.cash_drawer_sessions;
  result public.cash_drawer_adjustments;
begin
  select * into drawer from public.cash_drawer_sessions where id = p_session_id for update;
  if not found or private.current_store_role(drawer.store_id) not in ('owner', 'manager', 'staff') then raise exception 'cash_drawer_access_denied'; end if;
  if drawer.status <> 'open' then raise exception 'cash_drawer_closed'; end if;
  if p_adjustment_type not in ('paid_in', 'paid_out') then raise exception 'invalid_adjustment_type'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_adjustment_amount'; end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 240 then raise exception 'adjustment_reason_required'; end if;
  insert into public.cash_drawer_adjustments(store_id, session_id, adjustment_type, amount, reason, recorded_by)
  values (drawer.store_id, drawer.id, p_adjustment_type, p_amount, trim(p_reason), auth.uid())
  returning * into result;
  return result;
end;
$$;

create or replace function public.close_cash_drawer(
  p_session_id uuid,
  p_counted_cash numeric,
  p_note text default ''
)
returns public.cash_drawer_sessions
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  drawer public.cash_drawer_sessions;
  calculated_expected numeric(12, 2);
  result public.cash_drawer_sessions;
begin
  select * into drawer from public.cash_drawer_sessions where id = p_session_id for update;
  if not found or private.current_store_role(drawer.store_id) not in ('owner', 'manager', 'staff') then raise exception 'cash_drawer_access_denied'; end if;
  if drawer.status <> 'open' then raise exception 'cash_drawer_already_closed'; end if;
  if p_counted_cash is null or p_counted_cash < 0 then raise exception 'invalid_counted_cash'; end if;
  if length(coalesce(p_note, '')) > 500 then raise exception 'drawer_note_too_long'; end if;

  select drawer.opening_float
    + coalesce((select sum(payment.amount) from public.payments payment where payment.drawer_session_id = drawer.id and payment.method = 'cash' and payment.status = 'succeeded'), 0)
    + coalesce((select sum(case when adjustment.adjustment_type = 'paid_in' then adjustment.amount else adjustment.amount * -1 end) from public.cash_drawer_adjustments adjustment where adjustment.session_id = drawer.id), 0)
  into calculated_expected;

  update public.cash_drawer_sessions
  set status = 'closed', expected_cash = calculated_expected, counted_cash = p_counted_cash,
      variance = p_counted_cash - calculated_expected, closed_by = auth.uid(), closed_at = now(),
      closing_note = trim(coalesce(p_note, ''))
  where id = drawer.id
  returning * into result;
  return result;
end;
$$;

create or replace function private.assign_cash_drawer_session()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_store uuid;
  open_session uuid;
begin
  if new.method <> 'cash' then return new; end if;
  select orders.store_id into target_store from public.orders where id = new.order_id;
  select session.id into open_session
  from public.cash_drawer_sessions session
  where session.store_id = target_store and session.opened_by = new.received_by and session.status = 'open'
  order by session.opened_at desc limit 1;
  if open_session is null then raise exception 'open_cash_drawer_required'; end if;
  new.drawer_session_id := open_session;
  return new;
end;
$$;

revoke all on function private.assign_cash_drawer_session() from public, anon, authenticated;
create trigger payments_assign_cash_drawer before insert on public.payments
for each row execute function private.assign_cash_drawer_session();

revoke all on function public.open_cash_drawer(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.record_cash_drawer_adjustment(uuid, text, numeric, text) from public, anon;
revoke all on function public.close_cash_drawer(uuid, numeric, text) from public, anon;
grant execute on function public.open_cash_drawer(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.record_cash_drawer_adjustment(uuid, text, numeric, text) to authenticated;
grant execute on function public.close_cash_drawer(uuid, numeric, text) to authenticated;

grant select, insert, update, delete on public.cash_registers to authenticated;
grant select, delete on public.cash_drawer_sessions to authenticated;
grant select, delete on public.cash_drawer_adjustments to authenticated;

commit;
