# Daily report and AS Further Maths

Dashboard planning totals now use today's device-local date, not the current week.
The pure dailyStudyReport service excludes meals/breaks and matches saved entries
by date, time and raw activity identity. Repeated rows are deduplicated. Extra study
is listed separately and cannot inflate completion of the standing plan.
Past unlogged slots are labelled Not logged, not missed or failed. Upcoming slots
are not overdue. Planned minutes covered by logs are explicitly not actual measured
time. Weekly analytics elsewhere are unchanged. No background email is added.

AS Maths now displays as AS-Further Maths. The raw timetable identity remains AS
Maths to preserve existing database upsert keys. Filters, log labels and timetable
use the display alias; previously stored ordinary Maths topic evidence is retained
and never silently converted into Further Maths evidence.

Source: user-supplied as-l3-further-mathematics-specification.pdf, Pearson Edexcel
8FM0 Issue 5 (July 2025). PDF pages 12-15 provide Core Pure (6 topics, 25 numbered
subtopics). PDF pages 17-32 supply eight optional paper sections. All 37 topic
groups are included with concise labels and specification-scoped reference IDs.
Paper 2 has alternative combinations; all optional sections are labelled optional.
The paper picker is a browsing filter, not a declaration of the school's exam route.
No optional route has been assumed. The PDF and private attachment path are not
published. No additional database migration is required (005/007 remain required).

Verification: 39 unit checks and Chromium/Edge browser checks at 390px and 1440px,
including date exclusion, extras, today link, topic saving and optional-paper
selection. Browser saves use a mock backend; production Supabase writes and actual
iPhone Safari have not been verified by these tests.
