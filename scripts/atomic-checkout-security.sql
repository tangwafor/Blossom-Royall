\set ON_ERROR_STOP on

set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal1"}';

do $$
begin
  perform public.place_tenant_order(
    '20000000-0000-0000-0000-000000000001', 'onsite', 'pickup', 'cash',
    '[{"variant_id":"50000000-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
    125.00, null, null, null, null, null, '{}'::jsonb
  );
  raise exception 'Owner checkout was allowed at aal1';
exception when others then
  if sqlerrm <> 'store_access_denied' then raise; end if;
end;
$$;

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.inventory_movements;
  if visible_count <> 0 then raise exception 'Owner inventory was visible at aal1'; end if;
end;
$$;

set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal2"}';

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.inventory_movements;
  if visible_count < 1 then raise exception 'Owner inventory was not visible at aal2'; end if;
end;
$$;

reset role;

do $$
declare anon_execute boolean;
declare authenticated_execute boolean;
begin
  select has_function_privilege('anon', 'public.place_tenant_order(uuid,text,text,text,jsonb,numeric,text,text,text,text,bigint,jsonb)', 'execute') into anon_execute;
  select has_function_privilege('authenticated', 'public.place_tenant_order(uuid,text,text,text,jsonb,numeric,text,text,text,text,bigint,jsonb)', 'execute') into authenticated_execute;
  if anon_execute then raise exception 'Anonymous checkout execution is allowed'; end if;
  if not authenticated_execute then raise exception 'Authenticated checkout execution is missing'; end if;
end;
$$;

select 'atomic checkout security passed' as result;
