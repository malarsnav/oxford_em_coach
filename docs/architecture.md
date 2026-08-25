# Oxford E&M Coach Architecture

## Current Architecture

This repository was empty when implementation began, so the first production scaffold is a static, no-build web app designed for GitHub Pages at `/oxford_em_coach/`.

- Frontend: vanilla HTML, CSS, and JavaScript ES modules.
- Routing: in-memory tab navigation, so GitHub Pages does not need rewrite rules.
- Auth: Supabase Auth email magic links.
- Data: Supabase PostgreSQL accessed from a centralized browser data layer.
- Security: Row Level Security policies restrict all user-owned rows to `auth.uid() = user_id`.
- Deployment: GitHub Pages static artifact from the repository root.

## Reused / Preserved

There was no existing code in this repository to preserve. The scaffold preserves the requested product behaviour from the earlier local prototype: 5-question TARA/TSA sets, answer submission, methodology-first coaching, and analytics.

## New Modules

- `src/app.js`: UI composition, navigation and event handling.
- `src/dataService.js`: all Supabase/local-demo persistence and analytics assembly.
- `src/weeklyGeneratorService.js`: deterministic weekly programme generator.
- `src/questions.js`: initial static TARA/TSA question-bank seed.
- `src/methodologies.js`: reusable coaching methodologies by official question type.
- `src/supabaseClient.js`: Supabase client bootstrap.
- `supabase/migrations/001_initial_schema.sql`: database schema, indexes, triggers and RLS.

## Database Changes

The migration creates persistent tables for:

- TARA attempts and responses
- user profiles
- weekly programmes and tasks
- A-level subjects, results and topics
- E&M journal entries
- Oxford reasoning sessions
- milestones
- weekly reviews
- interview sessions
- TARA error analysis

## Readiness Model

The first readiness model is deliberately transparent and non-probabilistic. It does not estimate admission chances.

- Academic Strength: latest assessment percentages across subjects.
- TARA Readiness: overall TARA response accuracy.
- Supercurricular Depth: number of substantive journal entries, capped at 100.
- Oxford Reasoning: starts once reasoning sessions are recorded.
- Application Readiness: higher of weekly task completion and milestone completion.
- Interview Readiness: remains low until reasoning practice and relevant milestones are active.

Displayed bands:

- 0: Not Started
- 1-39: Early
- 40-69: Developing
- 70-84: Strong
- 85-100: Very Strong

## Recommendation Rules

The first version uses deterministic rules:

- If a TARA type is below 65%, recommend targeted practice and methodology review.
- If no E&M journal entry exists in the last 14 days, recommend a structured journal task.
- If Maths is not predicted A*, protect a quantitative revision block.
- If weekly completion is below 60%, reduce workload next week.

Future AI coaching should implement separate provider interfaces rather than embedding generated logic in UI components.
