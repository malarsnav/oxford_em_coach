# Parent Daily Digest Edge Function

This scaffold sends the previous day's parent summary from a scheduled Supabase Edge Function.

## What Exists

- Function source: `supabase/functions/daily-parent-digest/index.ts`
- Reads `user_profiles` where `parent_digest_enabled = true`
- Skips no-activity days unless `parent_digest_include_no_activity = true`
- Sends via Resend API

## Required Secrets

Set these in Supabase Edge Function secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
DIGEST_FROM_EMAIL
DAILY_DIGEST_CRON_SECRET
```

Do not put these values in the frontend or commit them to GitHub.

## Deploy Later

From a machine with Supabase CLI configured:

```bash
supabase functions deploy daily-parent-digest
```

Then create a daily schedule for roughly 6am UK time. Supabase schedules run in UTC, so adjust for UK daylight saving when necessary.

## Manual Test Later

Call the function with:

```bash
curl -X POST "https://PROJECT_REF.functions.supabase.co/daily-parent-digest" \
  -H "x-cron-secret: YOUR_SECRET"
```

The response returns which parent digests were sent or skipped.
