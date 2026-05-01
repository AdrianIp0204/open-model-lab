# Prelaunch Staging Checklist

Use this after the local harness/browser sanity work is already green. The goal here is to
separate "the repo works locally" from "real auth, Stripe test mode, and support delivery are
actually ready for wider sharing."

## 1. Run the bounded preflight

```bash
pnpm launch:doctor
pnpm content:doctor
pnpm validate:content
```

- `launch:doctor` checks the current env and the real-service seams for auth, Stripe, and
  feedback delivery. It reads the same local `.env*` files Next uses, with explicit shell env
  values taking precedence, and it now warns when Cloudflare preview parity is weaker than the
  local Next env.
- `content:doctor` keeps the subject/topic/track/setup graph honest.
- Do not move on to staging auth or Stripe checks while `launch:doctor` still reports errors.
- For `pnpm build`, `pnpm preview`, or deployment work through OpenNext/Wrangler, keep the same
  server secrets mirrored into `.dev.vars` or the deployment-secret layer. Those Cloudflare
  checks are separate from Next's `.env.local` loading.
- For Cloudflare preview/deploy, copy `wrangler.example.jsonc` to the ignored
  `wrangler.jsonc` and fill the private copy with real route, domain, and vendor
  values. Do not commit the private config.
- When testing or deploying AdSense, provide real seller metadata through
  `OPEN_MODEL_LAB_ADS_TXT_CONTENT` or `OPEN_MODEL_LAB_ADS_TXT_SOURCE`, run
  `pnpm ads:check`, then run `pnpm ads:write` so the ignored `public/ads.txt`
  exists before upload. Do not commit the real file.

## 1a. Provider-return route matrix

Use these exact return/result routes during manual staging checks:

- `/auth/callback?...` and `/auth/confirm?...` for real sign-in and magic-link returns
- `/account/reset-password?auth=expired`
- `/account/reset-password?auth=used`
- `/account/reset-password?auth=unavailable`
- `/account?auth=expired`
- `/account?auth=unavailable`
- `/account?billing=checkout-returned`
- `/pricing?billing=checkout-canceled`
- `/account?billing=portal-returned`

The goal is not pixel-perfect copy review. It is making sure each provider-return state lands on
an honest route with a bounded next step instead of a generic error.

## 2. Distinguish harness checks from real-service checks

Harness-only coverage is still useful for deterministic local QA:

- signed-out vs signed-in free vs signed-in premium account states
- saved setup and saved compare setup UI behavior
- progress merge and sync messaging
- achievement and reward-state rendering

Harness coverage is **not** a substitute for:

- real Supabase email-link or reset-password delivery
- real Stripe test Checkout and Billing Portal returns
- real Stripe webhook forwarding
- real feedback email delivery through Resend

The dev harness now rejects Checkout and Billing Portal starts on purpose. Use it for bounded
account-state QA, then switch to a real signed-in staging account for Stripe verification.

## 3. Real auth checks

Before testing real auth locally or in staging:

- set the Supabase envs from [launch-readiness.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/launch-readiness.md)
- use the real public/staging origin in `NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL`
- disable the harness for that browser, or use a clean browser profile

Manual checks:

1. Request a magic-link sign-in from `/account`.
2. Open the email link and confirm it lands on `/dashboard` or the intended `next` path.
3. Request a password-reset email from `/account`.
4. Open the recovery link and confirm `/account/reset-password` renders the in-browser password step.
5. Reuse or expire the recovery link once and confirm the bounded `expired` / `used` states appear.

## 4. Stripe test-mode checks

Stay on Stripe test mode for staging. Do not switch code or env docs to live values yet.

Before testing:

- set `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`
- keep Billing Portal enabled in the Stripe test dashboard
- forward webhooks when testing locally:

```bash
stripe listen --forward-to http://127.0.0.1:3000/api/billing/webhook
```

Manual checks:

1. Start checkout from `/pricing` or `/account` as a signed-in free account.
2. Complete one Stripe test checkout and confirm the return lands on `/account?billing=checkout-returned`.
3. Confirm the account page moves from the pending billing state into confirmed Premium after the webhook lands.
4. Open Stripe Billing Portal from the account page as a Premium test account.
5. Return through `/account?billing=portal-returned` and confirm the billing status refreshes.
6. Cancel or abandon one checkout and confirm the bounded canceled / still-processing copy remains honest.

What must be verified on a real staging deployment instead of localhost:

- the staging/public origin is whitelisted in Supabase redirect settings
- the staging/public origin is the actual Stripe return origin
- the hosted webhook endpoint receives Stripe test events without local CLI forwarding

## 5. Saved-study sync sanity

Using a real signed-in Premium test account:

1. Save one exact-state setup from a setup-capable concept.
2. Save one compare scene from a compare-capable concept.
3. Confirm both show up on `/account/setups` and `/account/compare-setups`.
4. Open a second browser context and confirm both synced objects appear there.
5. Reopen one saved setup with a challenge query layered on top and verify the current precedence rules still hold.

## 6. Feedback / contact checks

If direct email delivery is intended for staging:

- set `NEXT_PUBLIC_FEEDBACK_EMAIL`
- set `RESEND_API_KEY`, `FEEDBACK_FROM_EMAIL`, and `FEEDBACK_TO_EMAIL`

Manual checks:

1. Open `/contact`.
2. Submit one feedback note with reply contact.
3. Confirm the API returns success and the inbox receives the message.
4. Temporarily remove or invalidate the Resend envs and confirm the UI still exposes the bounded mailto fallback honestly.

## 7. Before wider sharing

Recheck:

- `/start`
- `/search`
- one subject page per subject
- one setup-capable concept
- one compare-capable concept
- `/account`
- `/account/setups`
- `/account/compare-setups`
- `/pricing`
- `/billing`
- `/privacy`
- `/terms`
- `/contact`

Use [platform-stability-checklist.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/platform-stability-checklist.md)
for the main route/state matrix, then use this doc for the real-service layer that the harness
cannot fully prove.
