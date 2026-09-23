-- Create Vault secrets student_reminder_url and student_reminder_cron_secret first.
-- URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/student-log-reminder
-- Secret must match the Edge Function secret STUDENT_REMINDER_CRON_SECRET.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='student_reminder_url')
     or not exists(select 1 from vault.decrypted_secrets where name='student_reminder_cron_secret') then
    raise exception 'Create both reminder secrets in Vault before scheduling';
  end if;
end $$;
select cron.unschedule(jobid) from cron.job where jobname='student-log-reminder';
-- UTC windows cover GMT and BST. Function gates sends using Europe/London time.
select cron.schedule('student-log-reminder','*/5 20-21 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='student_reminder_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='student_reminder_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 30000
  );
$job$);
