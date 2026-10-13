# Student workspace release

## Screens
- Today: daily planned blocks, logging state/RAG, partial work, task status and next action.
- Plan: study blocks by date/subject, school homework/assessments, timetable.
- Progress: daily and weekly reports and planned/logged bars, plus block-task completion.
- TARA: practice, inline history, mistake retry and analytics.
- Settings: student profile, password and student-only reminder preferences.

Existing records, subject catalogues, private school attachments and TARA coaching are retained.
No native application or new hosting is introduced. GitHub Pages remains the frontend.

## Required database action
Run supabase/migrations/009_student_workspace.sql after migrations 001 through 008.
This is transactional and can be rerun. It:
- revokes participant link access and all linked-parent read policies;
- removes the parent-link claiming function and parent-email/digest profile fields;
- adds owner-only, append-only timetable versions and owner-only block tasks;
- validates dated timetables, time ranges and overlapping blocks.

Student study/TARA records are not deleted. Old parent links are retained in the database
as revoked audit rows with no browser-role privileges.

Until SQL is applied, existing study logging/TARA still work, but timetable editing and
block tasks are unavailable. Parent database access is NOT revoked by a frontend deployment.
Production RLS must be checked using two distinct authenticated accounts after migration.

## Server deployment
After SQL, redeploy the student reminder function so it reads the student's current timetable:
```powershell
npx.cmd supabase functions deploy student-log-reminder --project-ref erkoucgtaonwrpjohfqw --use-api
```
The existing student reminder schedule and secrets are unchanged.
No new frontend or server secrets are required.

If daily-parent-digest was ever deployed, delete that Edge Function and its parent-only cron
job in Supabase, or deploy the retired 410-response implementation. Do not delete the
student-log-reminder cron job. Dropping the parent profile fields also prevents the old
digest implementation from reading recipients.

## Timetable rules
A new weekly version or single-date exception must start today or later.
Dates with existing logs cannot be rewritten. For weekly versions, later logged dates are
also protected. A second version for the same date/scope is rejected, not silently replaced.
Use the next effective date for subsequent changes. A one-day exception wins over a weekly
version. Empty one-day plans support a day off.
Plan dates use local calendar dates; the server's historical-edit cutoff uses Europe/London.

## Verification and limitations
Automated tests use mocked authenticated browser data and mock email delivery.
They do not establish successful production email delivery or live Supabase RLS behaviour.
Block tasks have separate status from a study log: completed tasks do not fabricate study time.
Homework/assessment uploads and teacher marks remain in Plan > Tasks; general block tasks
have a title, status and notes and do not yet link to an uploaded school task.
Learn gives immediate feedback; Test withholds marking and wording highlights until submission.
Learn locks the initial selected answer. Timing/scaled-score models have not been added.
