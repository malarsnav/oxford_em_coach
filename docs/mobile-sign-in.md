# Mobile sign-in and cross-device progress

This release extends the existing static website. It is not an App Store binary.
Home-screen metadata and icons are supplied, but there is no service worker,
offline save queue, native biometric lock or native secure-storage integration.
Internet access is required to open the app and save progress.

## Existing student setup

1. Keep the current signed-in account open on desktop.
2. Open Profile > Password sign-in and set a password of at least 12 characters.
3. On mobile, use that exact same email address and the new password.
4. Optionally use the browser's Add to Home Screen action.

No new student account or database rows are created for password authentication.
No SQL migration is needed. Supabase Auth changes the existing authenticated
user's password. Project password/security policies still apply; a project may
require recent authentication or an emailed reauthentication code for a password
change. No passwords are saved in profile tables or app preferences.

Mobile browsers, iPad desktop-style user agents and standalone launches default
to password sign-in and have no magic-link action. Desktop retains magic-link
sign-in and offers password sign-in too. Forgot password explicitly sends a
recovery email, never an automatic message on launch.

## Supabase configuration

Keep the existing Email provider enabled. Ensure the existing Pages origin/path
is an allowed redirect and add this exact recovery redirect if needed:

https://malarsnav.github.io/oxford_em_coach/?account=recovery

Recovery email still depends on the project's email delivery limits. The recovery
page requires an authenticated recovery session; its URL alone cannot change a
password. The SDK handles the recovery token and existing RLS remains enforced.
No service-role key is used in the browser.

Session persistence and token refresh are explicitly enabled. This does not
guarantee permanent sign-in: clearing browser data, private mode, revocation and
project session policies can require sign-in again. Sign out is local to this
device; it does not intentionally sign out desktop sessions.

## Sync behaviour

Existing saves go directly to the same Supabase tables. Opening, returning to a
visible app or reconnecting triggers a throttled (30 seconds) refresh. Read-only
reports rerender; editor forms and active TARA attempts are not replaced. Refresh
is deferred while edits are unsaved, and existing manual Refresh remains available.
This is foreground refresh, not realtime streaming or offline conflict resolution.
Two devices editing the same record can still overwrite one another on save.

If the production SDK fails to load, an error is shown rather than local demo mode.
Tests mock Supabase authentication and data responses: they do not change a real
password, send real recovery mail or prove iOS installed-session persistence.
Run tests/mobile-auth.cjs and tests/school-ui.cjs with PLAYWRIGHT_MODULE configured.

References:
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/reference/javascript/auth-updateuser
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/auth

Next: real-device acceptance with the student's account, then Capacitor packaging,
native storage/deep-link handling, offline drafts/conflict handling and store review.
