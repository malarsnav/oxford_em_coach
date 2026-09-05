# Structured study blocks

Plan Tracker keeps the original log identity (date, start/end time, activity) and all legacy notes. Display aliases map SMC to Super Curricular and Maths tuition to Maths without rewriting historical keys. AS Maths remains a separate study area. A collapsed timetable reference retains the parent's supplied times, including the weekday dinner overlap, which is flagged.

The ten study areas remain selectable even without slots. Coverage differentiates missing standing slots from activities absent only on the selected date. Extra study can be logged for any area/date. Selecting an existing slot opens its existing log instead of adding a duplicate.

Migration 007_study_block_details.sql adds one size-limited JSON object to study_plan_logs. Existing RLS and unique keys stay in force. No environment variables change. If the migration is missing, saving structured fields reports an explicit error and leaves the form intact; it never silently discards details.

Details version 1 includes area and either entries (academic topics) or activity-specific fields. Academic entries have a stable syllabus/custom ID, topic, sub-topic, reference, optional focus, activity modes, attempted/correct counts, score/total, notes and RAG. Multiple entries belong to one block: never multiply the block duration by the topic count. Score and question counts are optional; zero is distinct from missing. Coverage does not certify mastery.

The Maths library has 62 Pure and 27 Applied numbered content entries across 19 topics, plus optional topic-overview selections. Source: supplied Pearson Edexcel 9MA0 specification Issue 4, February 2020, printed pages 11-28 and 30-38. Labels summarize the content; they are not a verbatim replacement for the specification. Reference IDs are namespaced by section. No fixed difficulty is assigned. No AS-content classification is inferred from text extraction; AS Maths and other boards use custom entries until their content is verified.

SMC is the default activity for the existing weekend slots. Students can choose Competition or Other in any block; previous SMC logs remain intact. No competition dates are invented and no automatic timed switch is configured. EPQ, Book, Magazine and TARA have tailored fields. TARA can link an existing practice attempt without duplicating or changing its score. Custom academic topics can be reused without copying previous performance evidence.

Validation: node tests/plan-tracking.cjs; node tests/school-work.cjs. tests/school-ui.cjs runs phone/desktop checks with a mock backend for school tasks, multi-topic save, restored evidence, subject/date filters, SMC activity changes and unscheduled reading logs. It does not test production SQL or cross-user RLS. After migration, verify saves and refresh on the real account, then check the same logs on a second device.
