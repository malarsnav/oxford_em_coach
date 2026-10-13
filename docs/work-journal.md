# Daily work journal

Today is a subject-led work entry screen: date, subject, start/end, topics, work type, optional score, RAG and notes. Entries reuse study_plan_logs and match existing planned blocks by date, time and subject. Exact duplicate block keys are rejected by this form rather than silently replacing previous work; use Plan to edit existing logs. Non-matching entries are extra study, not completion of an unrelated planned slot.

Upcoming exams reuse academic_results with assessment_type=assessment, status=not_started, and assessment_date as the scheduled exam date. Countdowns use calendar dates, not elapsed hours. Complete or edit the assessment in Plan > Tasks. Past uncompleted exams remain visible as awaiting results.

Progress adds subject-level entry counts and self-reported durations for daily, Monday-Sunday weekly, and calendar-month periods. Existing daily/weekly plan comparisons remain. Monthly summaries cover recorded work only, not a monthly plan adherence percentage.

No new migration or secrets. Existing study log and school task migrations must already be installed (including 006 and 007). Existing row-level security and owner-scoped services are reused.

Tests: node tests/work-journal.cjs; tests/work-journal-ui.cjs with PLAYWRIGHT_MODULE set to an installed Playwright package. Browser tests mock persistence and do not establish live Supabase save success.
