create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  school text,
  target_course text default 'Oxford Economics & Management',
  target_university text default 'University of Oxford',
  current_school_year text default 'Year 12',
  application_year integer,
  parent_email text,
  parent_digest_enabled boolean default false,
  parent_digest_time time default '06:00',
  parent_digest_timezone text default 'Europe/London',
  parent_digest_include_no_activity boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_year text,
  set_name text,
  score integer not null,
  total integer not null,
  started_at timestamptz,
  completed_at timestamptz default now(),
  duration_seconds integer,
  created_at timestamptz default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_year text,
  question_number integer,
  section text,
  question_type text,
  reasoning_pattern text,
  selected_answer text,
  correct_answer text,
  is_correct boolean not null,
  response_seconds integer,
  created_at timestamptz default now()
);

create table if not exists public.weekly_programmes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  phase text,
  weekly_focus text,
  coach_summary text,
  version integer default 1,
  is_active boolean default true,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start, version)
);

create table if not exists public.weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.weekly_programmes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('a_level','tara','economics','management','oxford_reasoning','application')),
  title text not null,
  description text,
  estimated_minutes integer,
  priority text check (priority in ('high','medium','low')),
  status text default 'not_started' check (status in ('not_started','in_progress','completed','skipped')),
  due_date date,
  completion_notes text,
  reflection text,
  evidence_url text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_grade text,
  current_estimated_grade text,
  predicted_grade text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, name)
);

create table if not exists public.academic_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  assessment_name text not null,
  assessment_type text,
  assessment_date date,
  score numeric,
  max_score numeric,
  percentage numeric,
  grade text,
  topic text,
  teacher_feedback text,
  self_reflection text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.academic_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_name text not null,
  confidence integer default 3,
  mastery_status text default 'developing' check (mastery_status in ('weak','developing','secure','strong')),
  last_assessed_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text check (entry_type in ('book','article','lecture','podcast','essay','competition','research_project','debate','dataset','other')),
  title text not null,
  source text,
  author text,
  url text,
  date_completed date,
  topic_tags text[],
  main_claim text,
  mechanism text,
  evidence text,
  assumptions text,
  counterargument text,
  response text,
  what_changed_my_mind text,
  how_it_links_to_economics text,
  how_it_links_to_management text,
  interview_relevance text,
  application_relevance text,
  reflection text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.oxford_reasoning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date default current_date,
  prompt text,
  initial_answer text,
  assumptions text,
  reasoning_steps text,
  hint_given text,
  revised_answer text,
  coach_feedback text,
  score_reasoning integer,
  score_adaptability integer,
  score_clarity integer,
  score_assumptions integer,
  reflection text,
  created_at timestamptz default now()
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text check (category in ('school','tara','application','interview','supercurricular')),
  target_date date,
  status text default 'not_started' check (status in ('not_started','in_progress','completed','skipped')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  completed_summary text,
  skipped_summary text,
  hardest_area text,
  biggest_improvement text,
  biggest_weakness text,
  most_valuable_task text,
  student_reflection text,
  next_week_focus text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start)
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date,
  session_type text,
  topic text,
  questions jsonb,
  notes text,
  reasoning_feedback text,
  clarity_feedback text,
  adaptability_feedback text,
  quantitative_feedback text,
  overall_feedback text,
  next_steps text,
  created_at timestamptz default now()
);

create table if not exists public.tara_error_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  response_id uuid unique references public.responses(id) on delete cascade,
  error_category text,
  why_wrong text,
  correct_methodology text,
  clue_missed text,
  better_approach text,
  retry_required boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.attempts alter column paper_year type text using paper_year::text;
alter table public.responses alter column paper_year type text using paper_year::text;

create index if not exists idx_attempts_user_completed on public.attempts(user_id, completed_at desc);
create index if not exists idx_account_roles_user on public.account_roles(user_id, role);
create index if not exists idx_student_parent_links_student on public.student_parent_links(student_user_id, status);
create index if not exists idx_student_parent_links_parent on public.student_parent_links(parent_user_id, status);
create index if not exists idx_responses_user_type on public.responses(user_id, question_type, reasoning_pattern);
create index if not exists idx_weekly_programmes_current on public.weekly_programmes(user_id, week_start, week_end, is_active);
create index if not exists idx_weekly_tasks_lookup on public.weekly_tasks(user_id, programme_id, status, category, priority);
create index if not exists idx_subjects_user on public.subjects(user_id);
create index if not exists idx_academic_results_subject_date on public.academic_results(user_id, subject_id, assessment_date desc);
create index if not exists idx_journal_user_date on public.journal_entries(user_id, date_completed desc);
create index if not exists idx_milestones_user_date on public.milestones(user_id, target_date);

create trigger trg_user_profiles_updated before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger trg_student_parent_links_updated before update on public.student_parent_links for each row execute function public.set_updated_at();
create trigger trg_weekly_programmes_updated before update on public.weekly_programmes for each row execute function public.set_updated_at();
create trigger trg_weekly_tasks_updated before update on public.weekly_tasks for each row execute function public.set_updated_at();
create trigger trg_subjects_updated before update on public.subjects for each row execute function public.set_updated_at();
create trigger trg_academic_results_updated before update on public.academic_results for each row execute function public.set_updated_at();
create trigger trg_academic_topics_updated before update on public.academic_topics for each row execute function public.set_updated_at();
create trigger trg_journal_entries_updated before update on public.journal_entries for each row execute function public.set_updated_at();
create trigger trg_milestones_updated before update on public.milestones for each row execute function public.set_updated_at();
create trigger trg_weekly_reviews_updated before update on public.weekly_reviews for each row execute function public.set_updated_at();
create trigger trg_tara_error_analysis_updated before update on public.tara_error_analysis for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.account_roles enable row level security;
alter table public.student_parent_links enable row level security;
alter table public.attempts enable row level security;
alter table public.responses enable row level security;
alter table public.weekly_programmes enable row level security;
alter table public.weekly_tasks enable row level security;
alter table public.subjects enable row level security;
alter table public.academic_results enable row level security;
alter table public.academic_topics enable row level security;
alter table public.journal_entries enable row level security;
alter table public.oxford_reasoning_sessions enable row level security;
alter table public.milestones enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.tara_error_analysis enable row level security;

revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.account_roles from anon, authenticated;
revoke all on table public.student_parent_links from anon, authenticated;
revoke all on table public.attempts from anon, authenticated;
revoke all on table public.responses from anon, authenticated;
revoke all on table public.weekly_programmes from anon, authenticated;
revoke all on table public.weekly_tasks from anon, authenticated;
revoke all on table public.subjects from anon, authenticated;
revoke all on table public.academic_results from anon, authenticated;
revoke all on table public.academic_topics from anon, authenticated;
revoke all on table public.journal_entries from anon, authenticated;
revoke all on table public.oxford_reasoning_sessions from anon, authenticated;
revoke all on table public.milestones from anon, authenticated;
revoke all on table public.weekly_reviews from anon, authenticated;
revoke all on table public.interview_sessions from anon, authenticated;
revoke all on table public.tara_error_analysis from anon, authenticated;

grant select, insert, update on table public.user_profiles to authenticated;
grant select, insert, update on table public.account_roles to authenticated;
grant select, insert, update on table public.student_parent_links to authenticated;
grant select, insert, update on table public.attempts to authenticated;
grant select, insert, update on table public.responses to authenticated;
grant select, insert, update on table public.weekly_programmes to authenticated;
grant select, insert, update on table public.weekly_tasks to authenticated;
grant select, insert, update on table public.subjects to authenticated;
grant select, insert, update on table public.academic_results to authenticated;
grant select, insert, update on table public.academic_topics to authenticated;
grant select, insert, update on table public.journal_entries to authenticated;
grant select, insert, update on table public.oxford_reasoning_sessions to authenticated;
grant select, insert, update on table public.milestones to authenticated;
grant select, insert, update on table public.weekly_reviews to authenticated;
grant select, insert, update on table public.interview_sessions to authenticated;
grant select, insert, update on table public.tara_error_analysis to authenticated;

create policy "own profiles" on public.user_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own account roles" on public.account_roles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "student parent links visible to participants" on public.student_parent_links for select to authenticated using ((select auth.uid()) = student_user_id or (select auth.uid()) = parent_user_id);
create policy "students manage parent links" on public.student_parent_links for insert to authenticated with check ((select auth.uid()) = student_user_id);
create policy "students update parent links" on public.student_parent_links for update to authenticated using ((select auth.uid()) = student_user_id) with check ((select auth.uid()) = student_user_id);
create policy "own attempts" on public.attempts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own responses" on public.responses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own programmes" on public.weekly_programmes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tasks" on public.weekly_tasks for all to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.weekly_programmes p where p.id = programme_id and p.user_id = (select auth.uid()))
) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.weekly_programmes p where p.id = programme_id and p.user_id = (select auth.uid()))
);
create policy "own subjects" on public.subjects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own academic results" on public.academic_results for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own academic topics" on public.academic_topics for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own journal entries" on public.journal_entries for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own reasoning sessions" on public.oxford_reasoning_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own milestones" on public.milestones for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own weekly reviews" on public.weekly_reviews for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own interview sessions" on public.interview_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tara error analysis" on public.tara_error_analysis for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
