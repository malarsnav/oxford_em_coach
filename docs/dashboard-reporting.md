# Dashboard reporting

The shared standing plan became effective on 2026-09-05, as confirmed by the
parent. This is a fixed local calendar date in STUDY_PLAN_VERSIONS, not the
browser's first visit or a moving "today" default. All devices use the same
configuration; no SQL migration is required.

The complete revised timetable takes effect on 2026-09-23, as requested by the
parent. Earlier dates keep the original weekday and weekend snapshot. The full timetable
includes gym, school, rest and meals, but these are excluded from study targets.
Each new weekday has seven study/activity blocks (255 minutes), including two
separate Homework slots. TMUA groups under Maths, Article under Magazine, and
Reading(EPQ) under EPQ. Tuition is confirmed as Maths: its stored slot key stays
`Tuition` to preserve existing logs, while its label is Maths tuition and its
subject classification and topic picker are Maths. Earlier free-text tuition
notes remain visible and editable. Homework and Club support a subject/activity
name, progress notes and next action.
Coverage and the timetable preview use the selected date (range start in subject
view); reports crossing the change date select the correct snapshot per day.

The revised weekend timetable is part of the same 2026-09-23 version, rather
than waiting for 26 September to activate. Each weekend day has 13 separate
45-minute study blocks, including three Homework blocks and two blocks each
of Economics, History, Physics and Maths. Gym, shower, cardio, breaks and meals
remain visible in the timetable but are excluded from study completion targets.
Weekdays are unchanged. The complete new week has 61 blocks / 40.75 study hours.
AS Further Maths and Buffer no longer have standing slots; historical records
and extra-study logging remain available.

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
