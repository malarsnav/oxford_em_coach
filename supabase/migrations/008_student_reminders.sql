begin;
alter table public.user_profiles alter column target_course set default 'Oxford Philosophy, Politics and Economics';
update public.user_profiles set target_course='Oxford Philosophy, Politics and Economics'
where target_course in ('Oxford Economics & Management','Oxford Economics and Management');
create table if not exists public.student_reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.student_reminder_preferences enable row level security;
drop policy if exists reminder_select_own on public.student_reminder_preferences;
create policy reminder_select_own on public.student_reminder_preferences for select to authenticated using (auth.uid()=user_id);
drop policy if exists reminder_insert_own on public.student_reminder_preferences;
create policy reminder_insert_own on public.student_reminder_preferences for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists reminder_update_own on public.student_reminder_preferences;
create policy reminder_update_own on public.student_reminder_preferences for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
grant select,insert,update on public.student_reminder_preferences to authenticated;

-- Service-role only: atomically reserves a single delivery attempt per student/day.
create table if not exists public.student_reminder_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  status text not null check (status in ('pending','sent','failed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,local_date)
);
alter table public.student_reminder_deliveries enable row level security;
revoke all on public.student_reminder_deliveries from anon,authenticated;
grant all on public.student_reminder_deliveries to service_role;
grant all on public.student_reminder_preferences to service_role;
commit;
