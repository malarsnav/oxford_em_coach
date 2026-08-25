alter table public.user_profiles
  add column if not exists parent_digest_enabled boolean default false,
  add column if not exists parent_digest_time time default '06:00',
  add column if not exists parent_digest_timezone text default 'Europe/London',
  add column if not exists parent_digest_include_no_activity boolean default false;

comment on column public.user_profiles.parent_digest_enabled is
  'When true, the student has opted in to a daily parent digest once scheduled email delivery is configured.';

comment on column public.user_profiles.parent_digest_time is
  'Preferred local send time for the parent digest. Default is 06:00.';

comment on column public.user_profiles.parent_digest_timezone is
  'IANA timezone used for digest scheduling and previous-day summaries.';

comment on column public.user_profiles.parent_digest_include_no_activity is
  'When true, send a parent digest even if no activity was recorded for the previous day.';
