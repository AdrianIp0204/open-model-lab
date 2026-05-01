# Monetization Boundaries

Open Model Lab uses a free core learning product plus an optional Supporter convenience layer. This document describes the public product boundary. It does not rename internal entitlement values, change Stripe billing, change Supabase storage, or alter current gates.

## Free Core Learning

The free product should include:

- concept pages
- simulations and core interactive learning flows
- guided paths
- challenges
- basic practice and tests
- public learning tools, including Circuit Builder and Chemistry Reaction Mind Map
- local-first progress
- browsing without mandatory sign-in
- free account progress sync, as long as the live signed-in free account path continues to support it

Free users should still be able to understand the material, use the core tools, and move through the learning product. Paid features should not make basic understanding worse.

## Supporter Convenience Layer

The Supporter plan may include convenience, sustainability, and higher-cost features such as:

- ad-free browsing on routes where ads are eligible
- saved exact-state setups
- saved compare setups
- exact-state sharing
- richer review, analytics, and study tools
- account-backed saved tools
- future exports, cloud workflows, or API-costly AI features when they are clearly marked as future work and not described as shipped

The public framing should be sustainability and convenience: becoming a Supporter helps fund hosting, maintenance, development, and future improvements while adding convenience features.

## Ads Boundary

- Ads must stay limited to eligible discovery or safe public surfaces defined by the shared ad policy.
- Ads must not be added inside protected live learning benches, core interactive challenge flows, core practice flows, account/auth pages, billing flows, or trust pages.
- Supporter removes ads where ads are eligible.
- New ad placements require an explicit product and policy review. Do not add route-local ad slots outside `lib/ads/*` and `components/ads/*`.

## Technical Compatibility

- `lib/account/entitlements.ts` remains the source of truth for internal `free | premium` values and capability derivation.
- The current `premium` name is technical compatibility language for stored records, billing flows, tests, fixtures, and capability checks.
- Public copy can say Supporter while internal values remain `premium`.
- A future internal rename from `premium` to `supporter` would require a separate migration plan covering database rows, Stripe/webhook logic, API payloads, fixtures, stored user state, tests, and analytics/reporting assumptions.

## Source-Of-Truth References

- Entitlement and capability derivation: `lib/account/entitlements.ts`
- Stripe billing and webhook behavior: `lib/billing/*` and `app/api/billing/*`
- Ad eligibility and placements: `lib/ads/*` and `components/ads/*`
- Current ad setup notes: `docs/adsense-manual-ads.md`
