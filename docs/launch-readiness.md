# Launch Readiness

This doc covers the bounded launch layer that now exists in the repo. It separates
what the app supports directly from what still must be configured manually in vendor
dashboards before an ad-supported launch.

This is a maintainer/operator reference, not a turnkey guide for cloning the official
Open Model Lab deployment. Ordinary contributors do not need production vendor setup.
Independent fork operators must use their own brand, domains, vendor accounts, keys,
legal policies, and deployment process. Real official deployment config, secrets,
`wrangler.jsonc`, and `public/ads.txt` are intentionally not committed.

## What The Repo Supports

- Free vs premium entitlement with premium ad-free behavior
- Account-linked core learning progress sync for signed-in users
- Premium-gated saved compare setups, exact-state share tools, live worked examples, and advanced review surfaces
- Manual-first Google AdSense integration through the shared ad seam
- Dormant-by-default activation through an explicit feature flag
- A private/deploy-time static `public/ads.txt` materialization path, with `public/ads.example.txt` kept as the committed format reference
- One Premium monthly Stripe subscription flow
- Stripe checkout, billing portal, and webhook-driven entitlement updates
- Public trust pages:
  - `/privacy`
  - `/terms`
  - `/ads`
- `robots.txt`, `sitemap.xml`, canonical metadata, and root `metadataBase`

## Preflight Commands

Run these before deeper manual staging work:

```bash
pnpm launch:doctor
pnpm content:doctor
pnpm validate:content
```

- `launch:doctor` checks env/config readiness for the real auth, Stripe, and feedback seams.
- It also warns when Cloudflare preview/deploy parity looks weak, such as a missing private
  `wrangler.jsonc`, missing `.dev.vars` secret mirrors, canonical site-URL drift between
  Next env and `wrangler.jsonc`, or a harness flag that would make preview look healthier
  than real-provider staging. Copy `wrangler.example.jsonc` to the ignored `wrangler.jsonc`
  before real preview/deploy checks.
- `content:doctor` and `validate:content` keep the catalog/discovery layer honest.
- For the practical manual staging flow, use [prelaunch-staging-checklist.md](./prelaunch-staging-checklist.md).

## Operator-Only Production Environment

Prefer the explicit Open Model Lab env variable names below. The older `SITE_URL` / `NEXT_PUBLIC_SITE_URL`
fallbacks still work for compatibility, but they should not be the first choice for a fresh
deployment.

### Core site URL

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL=https://your-public-origin.example
```

Optional server-side fallback:

```bash
OPEN_MODEL_LAB_SITE_URL=https://your-public-origin.example
```

### Ads

Keep ads off until the AdSense account, placements, and public trust pages are ready. The
shared ad seam now fails closed unless the explicit public feature flag is enabled.

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=false
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID=ca-pub-your-publisher-id
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_HERO_BELOW=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_LIBRARY_DISCOVERY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_LIBRARY_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_DIRECTORY_DISCOVERY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_DIRECTORY_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_DIRECTORY_HEADER_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_HEADER_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_HEADER_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_GUIDED_DIRECTORY_DISCOVERY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_GUIDED_DIRECTORY_FOOTER_MULTIPLEX=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SEARCH_RESULTS_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_BODY_IN_ARTICLE=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_POST_LAB_DISPLAY=...
NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_FOOTER_MULTIPLEX=...
OPEN_MODEL_LAB_ADS_TXT_CONTENT=google.com, pub-your-publisher-id, DIRECT, your-certification-authority-id
# or
OPEN_MODEL_LAB_ADS_TXT_SOURCE=path/to/private/ads.txt
```

See [adsense-manual-ads.md](./adsense-manual-ads.md)
for the current placement registry and route policy.

### Feedback / contact

```bash
NEXT_PUBLIC_FEEDBACK_EMAIL=hello@your-domain.example
RESEND_API_KEY=your_resend_api_key_here
FEEDBACK_TO_EMAIL=inbox@your-domain.example
FEEDBACK_FROM_EMAIL=Open Model Lab <feedback@your-domain.example>
```

### Community support

The About page can point its direct-donation CTA at Buy Me a Coffee through an explicit
support URL seam. The public client-side name is preferred, with a server-side fallback if
you need one:

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_BUY_ME_A_COFFEE_URL=https://buymeacoffee.com/your-handle
OPEN_MODEL_LAB_BUY_ME_A_COFFEE_URL=https://buymeacoffee.com/your-handle
```

Optional local/dev override for provider mocking:

```bash
FEEDBACK_RESEND_API_BASE_URL=http://127.0.0.1:4010
```

If the delivery config is absent or invalid, the product still shows the public
email fallback and disables direct form sending honestly.

### Billing / Stripe

The current billing wave uses Stripe-hosted checkout and billing portal sessions. A
publishable key is not required for this first pass because the product does not embed
Stripe Elements client-side.

```bash
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
STRIPE_PREMIUM_PRICE_ID=your_supporter_price_id_here
STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID=your_reward_coupon_id_here
```

Optional local/dev override for a mock Stripe-compatible HTTP server:

```bash
STRIPE_API_BASE_URL=http://127.0.0.1:4011
```

### Analytics

```bash
NEXT_PUBLIC_ANALYTICS_ENABLED=true
ANALYTICS_WEBHOOK_URL=https://your-analytics-endpoint.example
ANALYTICS_WEBHOOK_TOKEN=...
```

Analytics is optional and separate from advertising.

### Account / sync

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Current Ad Placement Map

- `home.*` -> `/`
- `library.*` -> `/concepts`
- `topicDirectory.*` -> `/concepts/topics`
- `subjectDirectory.*` -> `/concepts/subjects`
- `topic.*` -> `/concepts/topics/[slug]`
- `subject.*` -> `/concepts/subjects/[slug]`
- `guided.*` -> `/guided`
- `search.resultsDisplay` -> `/search`
- `concept.*` -> `/concepts/[slug]`

Current policy:

- Free and signed-out users may see ads on those routes only when the explicit
  feature flag is enabled and the matching slot ids exist
- Premium users are ad-free
- Auth, account, dashboard, billing, trust, contact, challenge, and dev harness
  routes stay ad-free
- Concept pages are ad-eligible only in clearly separated non-interactive zones

## Manual AdSense Steps Outside The Repo

These steps are for maintainers/operators of an authorized deployment or independent forks
using their own AdSense account and branding. They are not instructions to publish an
official Open Model Lab clone.

1. Get the AdSense account approved for the production domain.
2. Create the manual units you want to activate first from the current placement
   registry.
3. Put the client ID and the needed slot IDs into the production environment.
4. Provide the real `ads.txt` through `OPEN_MODEL_LAB_ADS_TXT_CONTENT` or
   `OPEN_MODEL_LAB_ADS_TXT_SOURCE`, run `pnpm ads:check`, then run
   `pnpm ads:write` in the setup/deploy environment so the ignored
   `public/ads.txt` exists before upload.
5. Confirm the deployed static `/ads.txt` asset resolves on the public origin.
   If the publisher changes, update the private input and rerun the helper
   instead of committing real seller metadata or reintroducing a runtime route.
6. Review the public pages before enabling ads:
   - `/privacy`
   - `/terms`
   - `/ads`
   - `/pricing`

7. Keep `NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=false` until the slot envs,
   trust pages, and route QA are ready.
8. Configure any required consent messaging or CMP in the relevant vendor dashboard.
9. Flip `NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=true` only after the manual
   checks below pass.

This repo does **not** implement a bespoke cookie banner or CMP. If your launch region or
traffic mix requires consent tooling, that remains a manual launch step.

## Manual Stripe Steps Outside The Repo

These steps are for maintainers/operators of an authorized deployment or independent forks
using their own Stripe account and branding. They are not instructions to publish an
official Open Model Lab clone.

1. Create one recurring monthly price in Stripe for the Premium plan.
2. Copy that recurring price ID into `STRIPE_PREMIUM_PRICE_ID`.
3. Create one coupon for the earned achievement reward:
   - 25% off
   - duration `once`
   - intended only for the monthly Premium price
4. Copy that coupon ID into `STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID`.
5. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the deployment environment.
6. Point a Stripe webhook endpoint at `/api/billing/webhook`.
7. Subscribe the webhook to at least:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
8. Keep Stripe Billing Portal enabled for the production account if you want the account page manage-subscription CTA to work.
9. Do not rely on a public promo-code entry flow for this reward. The app applies the coupon server-side for the eligible signed-in free account.
10. The reward lifecycle is now:
   - `unlocked` while a free account can start discounted checkout
   - `claimed` while one discounted Stripe Checkout Session is reserved or resumable
   - `used` only after the Stripe subscription event turns Premium active or trialing
   - `expired` after the reward window closes without successful use

### Local Stripe webhook testing

1. Run the app locally with Stripe test-mode envs.
2. Forward webhooks locally with the Stripe CLI:

   `stripe listen --forward-to http://127.0.0.1:3000/api/billing/webhook`

3. Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Use the signed-in free account path on `/pricing` or `/account` to launch test checkout.
5. After Checkout returns to `/account?billing=checkout-returned`, verify the account page moves through:
   - `Confirming Premium access...`
   - then either `Premium access is confirmed` or a bounded still-processing/payment-recovery message
6. Use Stripe Billing Portal in test mode from the account page to verify a return through `/account?billing=portal-returned`.
7. In Stripe test mode, confirm at least one cancellation or payment-problem path:
   - cancel at period end in Billing Portal and verify the app shows Premium still active until the period-end date
   - or use Stripe test billing failure tooling and verify the app shows a payment-issue state with a recovery path back to Stripe
8. If you need repeatable renewal/cancellation timing later, Stripe test clocks are a useful advanced option, but they are not required for this bounded launch pass.
9. Confirm one canceled or abandoned discounted checkout does not permanently consume the reward:
   - start the discounted checkout from `/account`
   - leave Stripe without completing payment
   - retry from `/account`
   - verify the same discounted session resumes while it remains open, or the reward becomes reusable again after the Checkout Session expires

## Pre-Launch Product Checks

Before letting the production AdSense envs go live, verify:

1. `/`, `/concepts`, `/concepts/topics`, `/concepts/subjects`, `/guided`, and `/search` show only the intended ad placements for free browsing.
2. `/concepts/[slug]` shows ads only outside the protected live lab container.
3. `/about`, `/challenges`, `/pricing`, `/account`, `/contact`, `/privacy`, `/terms`, `/billing`, and `/dev/account-harness` remain ad-free.
4. Signed-in premium users see no ads and do not trigger the AdSense bootstrap on eligible routes.
5. Signed-in free users can sync core learning progress across devices without Premium.
6. Signed-in free users still receive honest `premium_required` responses for premium-only routes.
7. `/privacy`, `/terms`, and `/ads` are linked from the public footer and read truthfully.
8. `/ads.txt`, `/robots.txt`, and `/sitemap.xml` resolve on the public origin.
9. Root metadata uses the real production site URL instead of the localhost fallback.
10. Feedback and contact still work, including the fallback email path.
11. A signed-in free user can reach Stripe checkout from `/pricing` or `/account`.
12. A signed-in premium user sees a manage-subscription path on the account page.
13. A signed-in free user with an unlocked achievement reward sees the reward card on `/account`, and checkout applies the discount without exposing a public coupon code.
14. A signed-in premium user can still see badges on `/account`, but the reward card does not show a reward-claim CTA.
15. A claimed or expired reward state renders clearly on `/account`.

## Manual Feedback Delivery Steps Outside The Repo

1. Create a Resend account and verify the production sending domain.
2. Create a server-side API key with email-send access.
3. Set `RESEND_API_KEY`, `FEEDBACK_FROM_EMAIL`, and `FEEDBACK_TO_EMAIL` in production.
4. Keep `NEXT_PUBLIC_FEEDBACK_EMAIL` pointed at the public-facing contact address you want to display in the footer, `/contact`, and trust pages.
5. If your production sender uses a friendly-name identity, verify that exact mailbox/domain identity inside Resend before launch.

## Browser Smoke Checklist

The automated browser smoke suite now runs with:

`pnpm test:e2e`

Use the dev harness for deterministic QA locally:

1. Set `ENABLE_DEV_ACCOUNT_HARNESS=true`
2. Start the app locally
3. Open `/dev/account-harness`
4. Verify the following states:
   - signed out
   - signed in free
   - signed in premium

Check at least:

- `/`
- `/concepts`
- `/concepts/topics`
- `/guided`
- `/tracks/motion-and-circular-motion`
- `/concepts/projectile-motion`
- `/challenges`
- `/pricing`
- `/privacy`
- `/terms`
- `/ads`
- `/account`
- `/contact`

There is currently no `/tracks` index route in the live repo. Use a representative
starter-track detail page such as `/tracks/motion-and-circular-motion` for browser
smoke coverage instead of inventing a separate directory route.

For reward-state QA, verify all of these on `/account`:

- free ineligible
- free unlocked
- free claimed
- free expired
- premium signed-in

## Still Manual After This Wave

- Consent management platform configuration
- Final legal review of privacy and terms copy
- Additional plans, coupons, invoicing UI, and team billing
