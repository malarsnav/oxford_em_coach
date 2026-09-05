# Actual study, report dates and refresh

Existing study_plan_logs keys remain the planned date/time/activity. The details
JSON now stores outcome (followed, changed, skipped), actual_activity, actual_from,
actual_to and optional change_reason. Legacy logs without outcome mean followed.
No additional migration is needed beyond existing 005/007.

The tracker retains unsaved form fragments when changing subjects within a block.
Changing back restores that subject's entered fields. Only the chosen actual
subject's structured entries are saved. A skipped block retains previously saved
details but is excluded from topic-history credit and logged study minutes.
Rescheduling and split blocks are not implemented; the standing timetable remains
unchanged. Cross-midnight actual blocks are not supported.

Subject view includes planned slots and incoming substitutions; topic history
credits the actual subject. Dashboard differentiates logged records from followed,
changed and skipped outcomes. Minutes covered by logs describe planned slot time,
not measured elapsed study. Actual times are shown on changed blocks.

Report date defaults to today's local date. Yesterday/Today and date input select
other days; past unlogged slots never show as upcoming. Direct actions open the
selected date and slot. Future dates can be inspected but are not marked overdue.

Dashboard refresh is manual. The timestamp records successful initial loading,
dashboard refresh or study-save reload. Refresh failures leave the previous data
visible with an explicit warning and Retry. Save success followed by reload failure
is reported as saved, not as a failed save. This is not an offline write queue or
realtime sync. Existing Supabase owner authorization is unchanged.

Tests: unit date/attribution checks and 390/1440 browser tests for substitution,
draft switching, changed-time persistence, skipping, previous dates, retained data
on refresh error and successful retry. Browser backend is mocked; production
Supabase writes and physical mobile Safari were not verified.
