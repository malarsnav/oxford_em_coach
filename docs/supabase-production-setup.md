# Production Supabase Setup

## 1. Create Project

Create a Supabase project for Oxford E&M Coach.

Save these public browser values:

- Project URL
- Project API anon public key

Do not use or commit the service-role key.

## 2. Run Migration

Open Supabase SQL Editor and run:

`supabase/migrations/001_initial_schema.sql`

The migration creates the app tables, indexes, updated-at triggers, grants and Row Level Security policies.

## 3. Configure Auth URLs

In Supabase:

Authentication -> URL Configuration

Set Site URL:

`https://malarsnav.github.io/oxford_em_coach/`

Add Redirect URLs:

`https://malarsnav.github.io/oxford_em_coach/`

Optional local development redirect:

`http://127.0.0.1:4173/`

## 4. Enable Email Magic Links

In Supabase:

Authentication -> Providers -> Email

Enable email sign-in. The app uses `signInWithOtp`, so students receive a login email and return to the GitHub Pages URL.

## 5. Configure Browser Client

Edit `src/config.js`:

```js
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY';
```

The anon key is safe to use in a browser only because RLS protects user-owned rows.

## 6. Deploy Config

Commit and push `src/config.js` after replacing the placeholder values.

GitHub Pages will redeploy automatically from the workflow.

## 7. Production Smoke Test

1. Open `https://malarsnav.github.io/oxford_em_coach/`.
2. Enter the student email.
3. Open the magic link email on the same device.
4. Confirm the dashboard loads.
5. Generate a weekly programme and accept it.
6. Complete a 5-question TARA set.
7. Refresh the page and confirm progress persists.
8. Sign in from a second device with the same email and confirm the same data appears.

## 8. Security Checks

- RLS is enabled on all user-owned tables.
- Tables grant access only to authenticated users.
- Policies use `auth.uid()` to restrict rows to the signed-in user.
- No delete grants are enabled in the first version.
- No service-role key is used in the frontend.
