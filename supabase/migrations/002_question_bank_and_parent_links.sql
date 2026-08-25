create table if not exists public.account_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('student','parent','coach')),
  created_at timestamptz default now(),
  unique(user_id, role)
);

create table if not exists public.student_parent_links (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users(id) on delete cascade,
  parent_user_id uuid references auth.users(id) on delete set null,
  parent_email text not null,
  status text default 'invited' check (status in ('invited','active','revoked')),
  can_view_reflections boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_user_id, parent_email)
);

alter table public.attempts alter column paper_year type text using paper_year::text;
alter table public.responses alter column paper_year type text using paper_year::text;

create index if not exists idx_account_roles_user on public.account_roles(user_id, role);
create index if not exists idx_student_parent_links_student on public.student_parent_links(student_user_id, status);
create index if not exists idx_student_parent_links_parent on public.student_parent_links(parent_user_id, status);
create unique index if not exists idx_tara_error_analysis_response_id on public.tara_error_analysis(response_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_student_parent_links_updated'
  ) then
    create trigger trg_student_parent_links_updated
    before update on public.student_parent_links
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.account_roles enable row level security;
alter table public.student_parent_links enable row level security;

revoke all on table public.account_roles from anon, authenticated;
revoke all on table public.student_parent_links from anon, authenticated;

grant select, insert, update on table public.account_roles to authenticated;
grant select, insert, update on table public.student_parent_links to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_roles' and policyname = 'own account roles') then
    create policy "own account roles" on public.account_roles
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_parent_links' and policyname = 'student parent links visible to participants') then
    create policy "student parent links visible to participants" on public.student_parent_links
    for select to authenticated
    using ((select auth.uid()) = student_user_id or (select auth.uid()) = parent_user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_parent_links' and policyname = 'students manage parent links') then
    create policy "students manage parent links" on public.student_parent_links
    for insert to authenticated
    with check ((select auth.uid()) = student_user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'student_parent_links' and policyname = 'students update parent links') then
    create policy "students update parent links" on public.student_parent_links
    for update to authenticated
    using ((select auth.uid()) = student_user_id)
    with check ((select auth.uid()) = student_user_id);
  end if;
end;
$$;
