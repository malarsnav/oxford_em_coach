# Oxford E&M Coach

Static GitHub Pages app for Oxford Economics & Management preparation.

## Stack

- Vanilla HTML/CSS/JavaScript modules
- Supabase Auth and PostgreSQL from the browser
- GitHub Pages deployment under `/oxford_em_coach/`
- No runtime Node server and no server-side rendering

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor.
3. Copy `src/config.example.js` to `src/config.js`.
4. Add your Supabase project URL and public anon key to `src/config.js`.
5. Enable GitHub Pages for this repository.

Do not commit service-role keys or other secrets.

## Notes

The first version includes:

- email magic-link sign-in
- 5-question TARA mini-sets
- methodology-first coaching reports
- persistent attempts/responses
- TARA analytics
- weekly programme generation, draft review and save
- weekly task updates
- A-Level, journal, Oxford reasoning, milestones and weekly review surfaces
- rule-based recommendations and transparent readiness bands
