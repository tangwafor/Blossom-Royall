create or replace function private.audit_measurement_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (
    actor_user_id,
    store_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    auth.uid(),
    null,
    lower(tg_op),
    'measurement_profile',
    coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists measurement_profiles_audit on public.measurement_profiles;
create trigger measurement_profiles_audit
after insert or update or delete on public.measurement_profiles
for each row execute function private.audit_measurement_profile();

grant select, insert, update, delete on public.measurement_profiles to authenticated;
