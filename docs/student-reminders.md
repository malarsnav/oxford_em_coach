# Student logging reminders

The website has PPE branding, the family-provided university shortlist and a
logging evidence check-in. Email source is built; delivery is NOT active until
the following setup is completed. No email credentials belong in GitHub or chat.

## No-cost setup

Brevo Free currently allows 300 emails/day (checked 23 September 2026):
https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan
Create a free account at https://www.brevo.com/ and verify an approved sender.
Account approval or domain verification may be required. Do not purchase a plan
or domain automatically; stop if your existing sender cannot be approved.
This is separate from Supabase Auth emails and does not use Resend.

1. Run supabase/migrations/008_student_reminders.sql in SQL Editor.
2. In Edge Functions > Secrets set BREVO_API_KEY, REMINDER_FROM_EMAIL and
   STUDENT_REMINDER_CRON_SECRET (a long random secret). Supabase supplies its
   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to hosted Edge Functions.
3. Deploy from this repo: `supabase functions deploy student-log-reminder --project-ref erkoucgtaonwrpjohfqw`.
   Shared JS files in src are bundled with the function. Pasting only index.ts
   into the dashboard without those dependencies is insufficient.
4. Add Vault secrets student_reminder_url (deployed function URL) and
   student_reminder_cron_secret (same secret as step 2).
5. Run supabase/setup/student-reminder-cron.sql.
6. Signed in as the student, opt in under Profile > Student logging reminder.
7. Test a verified email with an elapsed unlogged block at the scheduled time.
   Check student_reminder_deliveries, provider logs and inbox/spam.

## Behaviour and limitations

Confirmed student Auth email only; no parent copy. 21:30 weekdays and 21:45
weekends in Europe/London, accounting for DST. The 5-minute scheduler has a
15-minute delivery window. Fully logged days (including explicit skips) do not
receive email. Database errors fail closed rather than assume missing work.
Unique user/date reservations allow at most one attempt per day. Failed or
ambiguous deliveries are not automatically retried, preventing duplicate mail.
Inspect provider logs before manually retrying. Paused Supabase projects and
provider outages can prevent delivery. Free-tier terms may change.

Evidence coverage = recorded elapsed blocks / elapsed planned blocks in the last
seven days, clipped to the new plan start. Future/rest blocks are excluded;
duplicate rows count once. Unlogged means unknown; skipped means explicitly not
studied. Extra study does not fill another slot. There is no validated admissions
failure probability, causal estimate or forecast of TARA performance here.
Academic results and test analytics remain separate evidence of performance.

The shortlist is family-provided, not an assessment of eligibility or offers.
Warwick/KCL remain alternatives. Recheck requirements for the application year.
EPQ should evidence independent research and reflection; entering a competition
does not automatically earn EPQ credit.

Tests use mocked backend/email services. Live SQL/RLS, cron/function deployment
and actual delivery require setup and have not been verified by those tests.
