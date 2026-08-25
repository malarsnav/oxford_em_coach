# Parent Daily Digest Edge Function

This scaffold sends the previous day's parent summary from a scheduled Supabase Edge Function.

## What Exists

- Function source: `supabase/functions/daily-parent-digest/index.ts`
- Reads `user_profiles` where `parent_digest_enabled = true`
- Skips no-activity days unless `parent_digest_include_no_activity = true`
- Email provider is not chosen yet; the function uses provider-neutral environment variables.

## Required Secrets

Set these in Supabase Edge Function secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
EMAIL_API_URL
EMAIL_API_KEY
DIGEST_FROM_EMAIL
EMAIL_PROVIDER_PAYLOAD_TEMPLATE
DAILY_DIGEST_CRON_SECRET
```

Do not put these values in the frontend or commit them to GitHub.

This is intentionally provider-neutral. The app does not require Resend specifically. Use whichever email provider you choose later, then map the generic payload to that provider with `EMAIL_PROVIDER_PAYLOAD_TEMPLATE` if needed.

`EMAIL_PROVIDER_PAYLOAD_TEMPLATE` is optional. If unset, the function sends this generic JSON payload:

```json
{
  "from": "sender@example.com",
  "to": "parent@example.com",
  "subject": "Oxford E&M Coach daily summary",
  "html": "<p>...</p>"
}
```

If a chosen provider expects different field names, set `EMAIL_PROVIDER_PAYLOAD_TEMPLATE` to a JSON string using placeholders:

```json
{"sender":"{{from}}","recipient":"{{to}}","subject":"{{subject}}","htmlContent":"{{html}}"}
```

The exact template should be filled in only after choosing an email provider.

## Deploy Later

From a machine with Supabase CLI configured:

```bash
supabase functions deploy daily-parent-digest
```

Then create a daily schedule for roughly 6am UK time. Supabase schedules run in UTC, so adjust for UK daylight saving when necessary.

The function summarises the previous Europe/London calendar day. The student does not need to be active at 6am; the scheduler simply runs the parent summary after the day has finished.

## Parent Read-Only Access

Run `supabase/migrations/004_parent_read_only_access.sql` after migration `003`.

When a student saves a parent email in Profile, the app creates an invited parent link. When that parent signs in with the same email address, the app calls `claim_parent_links()` and activates the link. Parent View can then read only summary tables for that linked student. Journal reflections and Oxford reasoning responses are deliberately not granted to parents in this first version.

## Manual Test Later

Call the function with:

```bash
curl -X POST "https://PROJECT_REF.functions.supabase.co/daily-parent-digest" \
  -H "x-cron-secret: YOUR_SECRET"
```

The response returns which parent digests were sent or skipped.
