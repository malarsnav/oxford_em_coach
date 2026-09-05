-- Additive only: existing log fields, unique keys and owner RLS are preserved.
begin;
alter table public.study_plan_logs add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.study_plan_logs drop constraint if exists study_plan_details_object;
alter table public.study_plan_logs add constraint study_plan_details_object check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 100000);
grant select, insert, update on public.study_plan_logs to authenticated;
commit;
