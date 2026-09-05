begin;
alter table public.academic_results
  add column if not exists status text not null default 'completed' check (status in ('not_started','in_progress','completed')),
  add column if not exists due_date date,
  add column if not exists description text,
  add column if not exists is_marked boolean not null default false,
  add column if not exists completed_at timestamptz,
  add column if not exists attachment_path text,
  add column if not exists attachment_name text;
update public.academic_results set is_marked = true where score is not null;
create index if not exists academic_work_due on public.academic_results(user_id, subject_id, status, due_date);

-- Enforce subject ownership even for a forged client request.
create or replace function public.validate_school_task_subject() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.subjects where id = new.subject_id and user_id = new.user_id) then
    raise exception 'Subject must belong to task owner';
  end if;
  if new.score is not null and (new.score < 0 or new.max_score is null or new.max_score <= 0 or new.score > new.max_score) then
    raise exception 'Invalid marks';
  end if;
  if new.status <> 'completed' and (new.score is not null or new.is_marked) then
    raise exception 'Complete task before recording marks';
  end if;
  return new;
end $$;
drop trigger if exists validate_school_task on public.academic_results;
create trigger validate_school_task before insert or update on public.academic_results
for each row execute function public.validate_school_task_subject();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-work', 'school-work', false, 10485760,
array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;
drop policy if exists school_work_read on storage.objects;
create policy school_work_read on storage.objects for select to authenticated
using (bucket_id = 'school-work' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists school_work_insert on storage.objects;
create policy school_work_insert on storage.objects for insert to authenticated
with check (bucket_id = 'school-work' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists school_work_delete on storage.objects;
create policy school_work_delete on storage.objects for delete to authenticated
using (bucket_id = 'school-work' and (storage.foldername(name))[1] = auth.uid()::text);
commit;
