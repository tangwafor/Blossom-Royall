\set ON_ERROR_STOP on
do $$
declare
  remaining integer;
  sale_count integer;
  movement_count integer;
begin
  select qty_on_hand into remaining from public.product_variants where id = '50000000-0000-0000-0000-000000000002';
  select count(*) into sale_count from public.order_items where variant_id = '50000000-0000-0000-0000-000000000002';
  select count(*) into movement_count from public.inventory_movements where variant_id = '50000000-0000-0000-0000-000000000002';
  if remaining <> 0 then raise exception 'Expected no stock remaining, found %', remaining; end if;
  if sale_count <> 1 then raise exception 'Expected exactly one last item sale, found %', sale_count; end if;
  if movement_count <> 1 then raise exception 'Expected exactly one last item movement, found %', movement_count; end if;
end;
$$;
select 'last item concurrency passed' as result;
