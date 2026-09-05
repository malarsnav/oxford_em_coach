# Dashboard reporting

The shared standing plan became effective on 2026-09-05, as confirmed by the
parent. This is a fixed local calendar date in STUDY_PLAN_VERSIONS, not the
browser's first visit or a moving "today" default. All devices use the same
configuration; no SQL migration is required.

Daily/weekly reporting and tracker slot generation use studyPlanForDate.
Dates before the first plan have no expected slots and no missed targets.
Existing earlier logs remain available in the tracker but do not contribute
to this plan's weekly reporting. The opening week contains only eligible days.
Future slots are not overdue. Skipped slots count as recorded, not studied.
Actual subject changes affect subject coverage without changing planned slots.

For a future timetable change, retain the existing snapshot and its source
arrays unchanged, and append a new dated snapshot. Do not replace historical
arrays or their effective dates. A per-student timetable editor and database
version storage are not implemented; the current plan is shared configuration.

Dashboard prioritises the daily summary, next block, chronological plan and
attention signals. Weekly detail opens from Reports at the bottom, with week
navigation and a return to Dashboard. No additional reflection form is needed.

Tests use mock storage for UI saves, not the live student's Supabase account.
