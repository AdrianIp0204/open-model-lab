# Account Sync Local Setup

This repo now uses Supabase Auth plus Postgres for the first bounded account/sync layer:

- Email-link sign-in for first-time and passwordless users
- Optional returning-user password sign-in once the account has set one
- In-browser password setup and recovery through `/account/create-password` and `/account/reset-password`
- Account-linked cross-device sync for the canonical concept-progress snapshot on any signed-in account
- A minimal per-user entitlement record with `free` and `premium`
- Signed-out browsing remains fully local-first

## Dev Account Harness

For local product QA, the preferred path is now the deterministic dev harness instead of
manual SQL updates or browser request interception.

Enable it in `.env.local`:

```bash
ENABLE_DEV_ACCOUNT_HARNESS=true
STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID=coupon_test_...
```

Then run the app locally and open:

`/dev/account-harness`

That route is development-only, requires the explicit env flag above, and is disabled in
production builds even if the flag is present.

The harness can switch the real app into four modes:

- `signed out`
- `signed in free`
- `signed in premium`
- `reset to real auth`

What it does:

- sets a dev-only cookie override for session/account resolution
- reuses the canonical `free` vs `premium` entitlement helpers
- lets signed-in fixtures use a local dev store for account-linked progress sync instead of requiring Supabase auth rows
- leaves production auth and entitlement behavior untouched when the harness is off

Recommended local browser QA flow:

1. Set `ENABLE_DEV_ACCOUNT_HARNESS=true`.
2. Start the app with `pnpm dev` or `pnpm exec next start`.
3. Open `/dev/account-harness`.
4. Switch between the three fixture states.
5. Verify `/pricing`, `/account`, `/concepts/projectile-motion`, compare save, share tools, and home/review surfaces through the real app.
6. Use `signed in free` to confirm core learning progress syncs across devices while premium-only saved/share surfaces stay locked.

### Achievement / reward QA

When the harness is enabled and a signed-in fixture is active, `/dev/account-harness` now also
provides dev-only controls to:

- reset the active fixture user's server-backed achievement state
- seed milestone counters directly
- seed named challenge badges with `concept-slug:challenge-id` entries
- seed named track badges with track slugs
- pin the reward state to `locked`, `unlocked`, `claimed`, or `expired`

Recommended local reward QA flow:

1. Switch to `signed in free`.
2. Use `Seed achievements and reward` on `/dev/account-harness`.
3. For a free eligible account, set:
   - `distinctChallengeCompletionCount=30` or `activeStudyHours=20`
   - `rewardState=unlocked`
4. For a claimed reward state, keep the fixture free and set `rewardState=claimed`.
   That now seeds the same resumable reserved-checkout UI state the real account flow uses.
5. For an expired reward state, keep the fixture free and set `rewardState=expired`.
6. For a deterministic locked state, use `rewardState=locked`.
7. Open `/account` after each seed to verify the visible reward card and badge groups.

Known limits of the harness:

- It is for local development only and is intentionally unavailable in production.
- `Reset to real auth` clears the harness override; it does not create or destroy a real Supabase session.
- Clicking `Sign out` while a harness fixture is active moves the harness to the deterministic signed-out fixture. Use `Reset to real auth` if you want to return to ordinary Supabase auth testing.
- Dev-harness reward states are for local account-page QA. Real Stripe checkout and webhook consumption still require the ordinary non-harness signed-in path.

### Playwright account E2E

The repo now includes a first-class Playwright browser suite for the signed-in
account achievements and reward journey.

Install the browser once:

```bash
pnpm test:e2e:install
```

Run the suite:

```bash
pnpm test:e2e
```

Useful local variants:

```bash
pnpm test:e2e:headed
pnpm exec playwright show-report output/playwright/report
```

What the Playwright config does:

- starts a local `pnpm exec next dev --hostname 127.0.0.1 --port 3100` server on `http://127.0.0.1:3100`
- forces `ENABLE_DEV_ACCOUNT_HARNESS=true` for that server
- stores harness fixture data in `output/playwright/dev-account-harness.json`
- uses the existing dev harness API to reset and seed the active fixture user
- covers the bounded signed-out account auth surface in addition to the account achievement and reward journey
- stubs only the final checkout response in the unlocked reward browser test so
  the suite verifies real app-side initiation without depending on a live
  external Stripe payment completion

The base Playwright suite does not require real Supabase auth rows or a live
Stripe checkout. Manual real-auth and real-Stripe QA still use the ordinary
setup documented below.

## Environment

Add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID=coupon_...
```

Notes:

- `NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL` should match the local URL you actually use while testing magic-link redirects.
- The Playwright suite overrides that site URL to `http://127.0.0.1:3100` for its own local server.
- `SUPABASE_SERVICE_ROLE_KEY` stays server-only. This first task does not expose it to the client.
- Achievement event writes, active-study session tracking, and the primary `/dashboard` achievement snapshot path depend on `SUPABASE_SERVICE_ROLE_KEY`. If that secret is missing in a deployment, `/account` can still render a bounded read-only overview, but counters will stay stale and `/dashboard` will fall back to the empty achievement snapshot warning.
- `ENABLE_DEV_ACCOUNT_HARNESS` is optional and only for local deterministic account-state QA.
- `STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID` must point at a Stripe coupon that gives 25% off for one billing period on the monthly Premium plan.

## Database

Run the SQL in:

`supabase/migrations/20260329164000_create_user_concept_progress_snapshots.sql`

and:

`supabase/migrations/20260402101500_create_user_entitlements.sql`

and:

`supabase/migrations/20260403101500_create_user_achievements.sql`

and:

`supabase/migrations/20260407120000_add_history_to_user_concept_progress_snapshots.sql`

Those migrations create:

- `public.user_concept_progress_snapshots` for the canonical synced concept-progress snapshot
- `public.user_concept_progress_snapshots.history` for compact synced checkpoint/mastery history used by Premium analytics
- `public.user_entitlements` for the bounded `free` vs `premium` tier record
- `public.user_achievement_stats` for server-backed achievement counters
- `public.user_achievement_progress_keys` for deduped question/challenge/track/concept qualifiers
- `public.user_earned_achievements` for earned badge rows
- `public.user_reward_unlocks` for the one-time Premium discount reward state
- `public.user_achievement_active_sessions` for signed-in concept engagement and active-study accumulation

Authenticated users can read only their own rows. The app never lets normal users write their own entitlement.

If `public.user_concept_progress_snapshots` exists but the `history` column migration has not been applied yet, signed-in core progress now falls back to snapshot-only sync so progress is still usable. Premium checkpoint-history and some server-rendered analytics signals stay degraded until that migration is applied, so production should still run the missing migration instead of relying on the compatibility fallback indefinitely.

## Manual Premium Testing

If you need to test the real Supabase-backed entitlement record instead of the dev harness,
use the user's Supabase auth UUID in the SQL editor:

```sql
insert into public.user_entitlements (user_id, tier)
values ('YOUR_AUTH_USER_ID', 'premium')
on conflict (user_id)
do update set
  tier = excluded.tier,
  updated_at = timezone('utc', now());
```

To move the same user back to free:

```sql
update public.user_entitlements
set tier = 'free',
    updated_at = timezone('utc', now())
where user_id = 'YOUR_AUTH_USER_ID';
```

Deleting the row also falls back to free because the app defaults signed-in users to the free tier when no entitlement row exists.

## Local Auth Surface

The live account page now exposes three bounded auth paths:

- returning-user password sign-in on `/account`
- email-link sign-in for first-time and passwordless users on `/account`
- password-reset email requests on `/account`

After a first successful confirmation, `/auth/confirm` may route the browser through
`/account/create-password` before continuing to the requested in-app destination. Recovery
links land on `/account/reset-password`, and that page uses the same bounded in-browser
password-update seam as the signed-in account page.

Relevant server seams:

- `POST /api/account/session` handles `magic-link`, `password-sign-in`, and `password-reset`
- `POST /api/account/password` handles in-browser password updates for a signed-in or recovery session

When the dev harness is active, both routes intentionally reject real password and email auth.
Use `Reset to real auth` on `/dev/account-harness` before testing live Supabase auth flows.

## Auth Redirects

In the Supabase dashboard:

1. Set the Auth site URL to your local app origin, for example `http://localhost:3000`.
2. Add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
3. Keep `http://localhost:3000/auth/callback` in the allowed redirect URLs too if you want the compatibility callback route available for older or provider-generated return shapes.

Do not point Supabase directly at `/account/create-password` or `/account/reset-password`.
Those are in-app pages reached only after `/auth/confirm` has handled the provider return.

For production, use the matching live origin for the same two routes:

- `https://YOUR_DOMAIN/auth/confirm`
- `https://YOUR_DOMAIN/auth/callback`

## Magic Link Template

The default Supabase Magic Link email works with this task as long as it uses:

`{{ .ConfirmationURL }}`

The repo now requests sign-in and recovery redirects through `/auth/confirm?...`, so a
successful sign-in should complete the cookie exchange and then land on the signed-in
dashboard, the requested in-app `next` path, or the bounded password-setup/recovery page
without requiring a manual refresh.

Open Model Lab still keeps `/auth/callback` as a compatibility fallback for browser-session return shapes, but `/auth/confirm` is the primary server-side handoff route. That route accepts both exchanged auth `code` values and hashed-token verification links, and it sanitizes `next` so post-auth redirects stay inside the app.
