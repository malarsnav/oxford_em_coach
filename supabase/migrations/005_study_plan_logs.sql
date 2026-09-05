create table if not exists public.study_plan_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  day_name text not null,
  start_time text not null,
  end_time text not null,
  planned_activity text not null,
  topics_covered text,
  topics_practised text,
  topics_assessed text,
  rag_status text check (rag_status in ('green', 'amber', 'red') or rag_status is null),
  reflection text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, log_date, start_time, end_time, planned_activity)
);

create index if not exists idx_study_plan_logs_user_date on public.study_plan_logs(user_id, log_date);
create index if not exists idx_study_plan_logs_user_rag on public.study_plan_logs(user_id, rag_status);

drop trigger if exists trg_study_plan_logs_updated on public.study_plan_logs;
create trigger trg_study_plan_logs_updated
before update on public.study_plan_logs
for each row execute function public.set_updated_at();

alter table public.study_plan_logs enable row level security;

drop policy if exists "study_plan_logs_select_own" on public.study_plan_logs;
create policy "study_plan_logs_select_own" on public.study_plan_logs
for select using (auth.uid() = user_id);

drop policy if exists "study_plan_logs_insert_own" on public.study_plan_logs;
create policy "study_plan_logs_insert_own" on public.study_plan_logs
for insert with check (auth.uid() = user_id);

drop policy if exists "study_plan_logs_update_own" on public.study_plan_logs;
create policy "study_plan_logs_update_own" on public.study_plan_logs
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "study_plan_logs_delete_own" on public.study_plan_logs;
create policy "study_plan_logs_delete_own" on public.study_plan_logs
for delete using (auth.uid() = user_id);
