# Homework and assessment tracking

A-Level Rigour uses the existing academic_results table for homework and assessment tasks. Existing results are retained as completed tasks. Unmarked tasks have null scores and do not enter score averages. Status and marking are separate: a completed task may await marking.

Run supabase/migrations/006_school_tasks.sql after migrations 001-005. It adds task fields and a private school-work bucket (10 MB, PDF/JPG/PNG/DOCX). Existing academic_results owner RLS remains in force; a trigger also checks subject ownership and mark validity. Storage policies limit access to the signed-in user's folder. Files are accessed with 60-second signed URLs. No new environment variables or paid service are required.

Student reflections are not added to parent summaries. Existing records from removed journal/reasoning modules remain in the database, but their navigation, dashboard cards, analytics and digest prompts are removed.

Plan Tracker selects any date or a subject/activity date range up to one year. It reuses study_plan_logs, including historical blocks that differ from the current template. Existing plan logs are preserved.

Checks: node tests/school-work.cjs runs mark/status validation tests. Set PLAYWRIGHT_MODULE to an installed Playwright module (or install Playwright outside the deployed app), then node tests/school-ui.cjs runs desktop/mobile UI checks using an isolated mock backend. These cover upload, homework save, marks, refresh and tracker filtering. They do not verify live Supabase RLS or real storage uploads.

After migration: create a homework task with a PDF, reopen it on a second device, complete it, enter teacher marks and feedback, and refresh. Repeat for an assessment. Verify a different account cannot read its record or file. Deployment remains static GitHub Pages, with relative module paths.
