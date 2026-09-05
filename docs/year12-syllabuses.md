# Year 12 / AS study tracking

The Plan Tracker uses the saved profile school year (already defaults to Year 12).
New Year 12 blocks default to AS content. Year 13 defaults to all supplied content.
This is a content filter, not a claim about exam entry or automatic promotion.
Students can change scope in each block; it is saved in details.syllabus_scope.
Changing scope preserves all selected evidence, including later content already selected.

## Sources and scope

- Edexcel AS Mathematics 8MA0, Issue 3, October 2025, supplied
  `as-l3-mathematics-specification.pdf`: PDF 14-22 Pure and 23-27 Applied.
  The requested PDF 28-30 contain assessment information rather than extra topics.
  17 groups, 34 Pure numbered entries and 18 Statistics/Mechanics entries.
  Both Maths and AS Maths timetable areas use this catalogue by default; their logs
  remain separate. References are namespaced by specification and section.
- The existing Edexcel A-level 9MA0 Issue 4 catalogue remains available under all
  supplied content. Existing IDs and saved descriptions are not converted to AS.
- OCR AS Physics A H156, Version 2.0, supplied
  `171759-specification-accredited-as-level-gce-physics-a-h156.pdf`:
  PDF 12 lists four modules and 14 submodules. Subsequent pages supply 39 numbered
  content headings. No H556-only modules or practical endorsement are invented.
- Edexcel Economics A 9EC0 Issue 2, supplied `A_Level_Econ_A_Spec.pdf`:
  PDF 20-33 Themes 1-2, PDF 36-51 Themes 3-4. All 21 subthemes and 87 numbered
  headings are represented by short content labels. Themes 1-2 (46 headings)
  default for AS; Themes 3-4 are labelled A-level only. AS alignment confirmed by
  Pearson's Getting Started guide:
  https://qualifications.pearson.com/content/dam/pdf/A%20Level/Economics/2015/teaching-and-learning-materials/getting-started-guide-new.pdf
- History: user-supplied 1C Tudors and 2N Russia content. AS includes Tudors
  1485-1547 (Henry VII and VIII) and Russia 1917-1929 (three periods).
  All supplied later content retained behind the full-content scope. History item
  suffixes are local tracker IDs, not official specification paragraph numbers.
  Russia boundary verified at:
  https://www.aqa.org.uk/subjects/history/a-level/history-7042/specification/subject-content/2n-revolution-and-dictatorship-russia-1917-1953

Labels are concise summaries, not a reproduction of every guidance/example or
assessment criterion. Students can record finer detail in the specific-skill field
or add any number of custom topics. Catalogues do not imply mastery or difficulty.
Source PDFs and personal attachment paths are not deployed.

## Persistence and compatibility

No new schema: requires existing migrations 005 and 007, as before. The structured
details JSON stores scope, specification and topic evidence. Each entry now also
identifies its specification so mixed-scope blocks remain interpretable. Old Maths
logs without a scope retain the full 9MA0 picker. Custom and legacy text survive.
No profile rows are overwritten, no attempts changed, no timetable renamed.
The planned-versus-actual activity proposal is separate and is not part of this change.

## Verification

Run `node tests/plan-tracking.cjs`, `node tests/school-work.cjs`, and
`node tests/school-ui.cjs` with PLAYWRIGHT_MODULE set when needed.
Browser checks cover 390px and 1440px, subject selectors, multiple topics,
scope-switch preservation, later-history visibility, saves and reloads with a mock
data layer. They do not verify production Supabase RLS, device Safari or live writes.
