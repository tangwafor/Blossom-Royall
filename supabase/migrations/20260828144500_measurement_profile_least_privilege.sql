revoke all privileges on table public.measurement_profiles from anon, authenticated;
grant select, insert, update, delete on table public.measurement_profiles to authenticated;
