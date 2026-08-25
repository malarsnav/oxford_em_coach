create or replace function public.claim_parent_links()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer;
begin
  update public.student_parent_links
  set
    parent_user_id = auth.uid(),
    status = 'active',
    updated_at = now()
  where lower(parent_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and status in ('invited', 'active')
    and (parent_user_id is null or parent_user_id = auth.uid());

  get diagnostics claimed_count = row_count;

  insert into public.account_roles (user_id, role)
  values (auth.uid(), 'parent')
  on conflict (user_id, role) do nothing;

  return claimed_count;
end;
$$;

grant execute on function public.claim_parent_links() to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'parents read linked student profiles') then
    create policy "parents read linked student profiles" on public.user_profiles
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = user_profiles.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'attempts' and policyname = 'parents read linked student attempts') then
    create policy "parents read linked student attempts" on public.attempts
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = attempts.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'responses' and policyname = 'parents read linked student responses') then
    create policy "parents read linked student responses" on public.responses
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = responses.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_programmes' and policyname = 'parents read linked student programmes') then
    create policy "parents read linked student programmes" on public.weekly_programmes
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = weekly_programmes.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_tasks' and policyname = 'parents read linked student tasks') then
    create policy "parents read linked student tasks" on public.weekly_tasks
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = weekly_tasks.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subjects' and policyname = 'parents read linked student subjects') then
    create policy "parents read linked student subjects" on public.subjects
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = subjects.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'academic_results' and policyname = 'parents read linked student academic results') then
    create policy "parents read linked student academic results" on public.academic_results
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = academic_results.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'academic_topics' and policyname = 'parents read linked student academic topics') then
    create policy "parents read linked student academic topics" on public.academic_topics
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = academic_topics.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'milestones' and policyname = 'parents read linked student milestones') then
    create policy "parents read linked student milestones" on public.milestones
    for select to authenticated
    using (exists (
      select 1 from public.student_parent_links spl
      where spl.student_user_id = milestones.user_id
        and spl.parent_user_id = (select auth.uid())
        and spl.status = 'active'
    ));
  end if;
end;
$$;
