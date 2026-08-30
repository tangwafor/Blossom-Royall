begin;

drop policy if exists orders_access on public.orders;
create policy orders_access on public.orders for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or customer_id = (select auth.uid())
);

create or replace function public.get_vendor_order_summaries(p_store_id uuid)
returns table (
  id uuid,
  attributed_total numeric,
  status text,
  fulfillment_method text,
  fulfillment_status text,
  payment_status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    order_record.id,
    sum(item.qty * item.unit_price)::numeric as attributed_total,
    order_record.status,
    order_record.fulfillment_method,
    order_record.fulfillment_status,
    order_record.payment_status,
    order_record.created_at
  from public.orders order_record
  join public.order_items item on item.order_id = order_record.id
  where auth.uid() is not null
    and order_record.store_id = p_store_id
    and private.owns_vendor(item.vendor_id)
  group by order_record.id
  order by order_record.created_at desc
  limit 50;
$$;

revoke all on function public.get_vendor_order_summaries(uuid) from public, anon;
grant execute on function public.get_vendor_order_summaries(uuid) to authenticated;

commit;
