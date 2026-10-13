begin;

-- Revoke the retired parent feature, including access granted by older clients.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and (policyname like 'parents read linked student%' or tablename='student_parent_links')
  loop
    execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
  if to_regclass('public.student_parent_links') is not null then
    update public.student_parent_links set status='revoked';
    revoke all on public.student_parent_links from anon, authenticated;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='user_profiles' and column_name='parent_digest_enabled') then
    update public.user_profiles set parent_digest_enabled=false;
  end if;
end $$;
drop function if exists public.claim_parent_links();
alter table public.user_profiles drop column if exists parent_email,
  drop column if exists parent_digest_enabled,
  drop column if exists parent_digest_time,
  drop column if exists parent_digest_timezone,
  drop column if exists parent_digest_include_no_activity;

create table if not exists public.study_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null,
  single_day boolean not null default false,
  blocks jsonb not null check(jsonb_typeof(blocks)='array'),
  created_at timestamptz not null default now(),
  unique(user_id,effective_from,single_day)
);
alter table public.study_plan_versions enable row level security;
drop policy if exists "student reads plan versions" on public.study_plan_versions;
create policy "student reads plan versions" on public.study_plan_versions for select to authenticated using(auth.uid()=user_id);
drop policy if exists "student creates plan versions" on public.study_plan_versions;
create policy "student creates plan versions" on public.study_plan_versions for insert to authenticated with check(auth.uid()=user_id);
-- Versions are append-only: never rewrite a timetable already used for reporting.
create or replace function public.validate_study_plan_version() returns trigger language plpgsql set search_path=public as $
declare b jsonb;
begin
  if new.effective_from < (now() at time zone 'Europe/London')::date then
    raise exception 'New plans must start today or later';
  end if;
  if exists(select 1 from public.study_plan_logs where user_id=new.user_id and
    (log_date=new.effective_from or (not new.single_day and log_date>new.effective_from))) then
    raise exception 'This date already has study logs. Choose a later effective date';
  end if;
  if jsonb_array_length(new.blocks)>200 then raise exception 'Too many timetable blocks'; end if;
  for b in select value from jsonb_array_elements(new.blocks) loop
    if coalesce(b->>'day','') not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
      or coalesce(b->>'from','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]
drop trigger if exists validate_study_plan_version on public.study_plan_versions;
create trigger validate_study_plan_version before insert on public.study_plan_versions for each row execute function public.validate_study_plan_version();

create table if not exists public.study_block_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null check(end_time>start_time),
  activity text not null,
  title text not null check(length(trim(title)) between 1 and 250),
  status text not null default 'not_started' check(status in ('not_started','in_progress','completed','skipped')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists study_block_tasks_user_date on public.study_block_tasks(user_id,block_date);
alter table public.study_block_tasks enable row level security;
drop policy if exists "student reads block tasks" on public.study_block_tasks;
create policy "student reads block tasks" on public.study_block_tasks for select to authenticated using(auth.uid()=user_id);
drop policy if exists "student creates block tasks" on public.study_block_tasks;
create policy "student creates block tasks" on public.study_block_tasks for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "student updates block tasks" on public.study_block_tasks;
create policy "student updates block tasks" on public.study_block_tasks for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert on public.study_plan_versions to authenticated;
grant select,insert,update on public.study_block_tasks to authenticated;
commit;
      or coalesce(b->>'to','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]
drop trigger if exists validate_study_plan_version on public.study_plan_versions;
create trigger validate_study_plan_version before insert on public.study_plan_versions for each row execute function public.validate_study_plan_version();

create table if not exists public.study_block_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null check(end_time>start_time),
  activity text not null,
  title text not null check(length(trim(title)) between 1 and 250),
  status text not null default 'not_started' check(status in ('not_started','in_progress','completed','skipped')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists study_block_tasks_user_date on public.study_block_tasks(user_id,block_date);
alter table public.study_block_tasks enable row level security;
drop policy if exists "student reads block tasks" on public.study_block_tasks;
create policy "student reads block tasks" on public.study_block_tasks for select to authenticated using(auth.uid()=user_id);
drop policy if exists "student creates block tasks" on public.study_block_tasks;
create policy "student creates block tasks" on public.study_block_tasks for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "student updates block tasks" on public.study_block_tasks;
create policy "student updates block tasks" on public.study_block_tasks for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert on public.study_plan_versions to authenticated;
grant select,insert,update on public.study_block_tasks to authenticated;
commit;
      or coalesce(b->>'from','')>=coalesce(b->>'to','')
      or length(trim(coalesce(b->>'activity',''))) not between 1 and 100 then
      raise exception 'Invalid timetable block';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(new.blocks) with ordinality a(value,n)
    join jsonb_array_elements(new.blocks) with ordinality b(value,n)
      on a.n<b.n and a.value->>'day'=b.value->>'day'
      and a.value->>'from'<b.value->>'to' and b.value->>'from'<a.value->>'to'
  ) then raise exception 'Timetable blocks must not overlap'; end if;
  return new;
end $;
drop trigger if exists validate_study_plan_version on public.study_plan_versions;
create trigger validate_study_plan_version before insert on public.study_plan_versions for each row execute function public.validate_study_plan_version();

create table if not exists public.study_block_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null check(end_time>start_time),
  activity text not null,
  title text not null check(length(trim(title)) between 1 and 250),
  status text not null default 'not_started' check(status in ('not_started','in_progress','completed','skipped')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists study_block_tasks_user_date on public.study_block_tasks(user_id,block_date);
alter table public.study_block_tasks enable row level security;
drop policy if exists "student reads block tasks" on public.study_block_tasks;
create policy "student reads block tasks" on public.study_block_tasks for select to authenticated using(auth.uid()=user_id);
drop policy if exists "student creates block tasks" on public.study_block_tasks;
create policy "student creates block tasks" on public.study_block_tasks for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "student updates block tasks" on public.study_block_tasks;
create policy "student updates block tasks" on public.study_block_tasks for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert on public.study_plan_versions to authenticated;
grant select,insert,update on public.study_block_tasks to authenticated;
commit;
