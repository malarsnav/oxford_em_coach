# Timetable comparison

Plan now offers Timetable and Planned vs actual, with a date selector. Study blocks and Tasks are no longer exposed. Existing task records and logs are retained, not deleted.

Comparison uses the timetable effective on the chosen date, and actual log subject/start/end where present. Logged intervals are clipped to each study slot; interval unions avoid counting duplicate minutes within that slot. Different subjects and uncovered minutes are shown separately. Overlapping records are explicitly flagged. Work outside planned study slots is listed separately. An unlogged slot is unknown, not assumed skipped; future slots are Upcoming. Skipped status requires an explicit historical skip record.

Progress uses the same comparison for day/week/month to avoid contradictory exact-key matching. No new database migration is needed. Browser verification uses mocked account data; live user saves are not exercised.
