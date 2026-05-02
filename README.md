# Open Model Lab

Open Model Lab is a simulation-first science-learning site built with Next.js App Router, React, TypeScript, and Tailwind.

## Public source, not an official deployment kit

This is the public source release of Open Model Lab. It is published for code reading, learning, architecture review, issue reports, and focused contributions.

It is not a turnkey production deployment package for cloning the official Open Model Lab website. Real production configuration is intentionally absent: real `wrangler.jsonc`, real `public/ads.txt`, deployment secrets, vendor accounts, private Stripe/Resend/AdSense/Supabase setup, and private operator history are not included.

Ordinary code, docs, content, test, accessibility, and localization contributions do not need production vendor setup. Anyone operating an independent fork must use their own name, branding, domains, vendor accounts, keys, legal policies, and deployment process. The Open Model Lab name, logo, marks, domains, and official presentation are reserved under [BRAND.md](./BRAND.md).

This public repository is the active source of truth for future development. See [docs/repository-identity.md](./docs/repository-identity.md) for the distinction between this repository and the private historical/archive repository.

This repo is no longer the earlier static prototype. The current codebase already includes:

- a structured concept catalog and authored concept-content system
- shared concept-page assembly and simulation renderer seams
- guided collections, starter tracks, challenge flows, and assignment/account surfaces
- local-first progress plus optional signed-in sync
- a canonical `free | premium` entitlement seam
- Stripe-hosted billing with webhook-driven entitlement updates
- bounded ad placements on discovery pages only
- server-side feedback/contact delivery with a visible fallback path
- public trust/compliance pages and launch-readiness docs

## Current product scope

- Physics-focused today, with broader science-friendly branding
- A catalog spanning mechanics, oscillations and waves, optics, electricity, and early magnetism/electromagnetism
- Simulation-first concept labs with supporting worked examples, review tools, progress cues, and share links
- Signed-out usage stays local-first; signed-in usage can layer on account sync and the current paid convenience capabilities

## Business model and current product boundaries

- The canonical entitlement seam lives in `lib/account/entitlements.ts`.
- The current internal tier model is still `free` and `premium`.
- Public copy is moving toward free core learning plus an optional Supporter plan for sustainability and convenience.
- The current Supporter copy model does not change billing, webhook, database, API, or entitlement internals.
- Signed-in free accounts can sync the core progress snapshot.
- The paid convenience layer currently gates:
  - saved compare setups
  - exact-state sharing and public experiment-card flows
  - richer study and review surfaces
  - ad-free browsing
- Billing uses Stripe-hosted checkout and billing portal flows. Webhooks update the billing profile and entitlement records.
- Ads are intentionally bounded to discovery surfaces only:
  - `/`
  - `/concepts`
  - `/concepts/topics`
  - `/guided`
- Concept labs, challenges, pricing, account/auth, contact, and dev harness pages remain ad-free.
- Feedback and contact go through `app/api/feedback/route.ts` and `lib/feedback-delivery.ts`, with direct delivery when configured and an honest public email fallback when not.

## Public repository notes

This public repository starts from a clean public release history. Repo-facing preparation and maintenance notes live in:

- [Open-source roadmap](./docs/open-source-roadmap.md)
- [Monetization boundaries](./docs/monetization-boundaries.md)
- [Public release safety checklist](./docs/public-release-safety-checklist.md)
- [Public release hygiene inventory](./docs/public-release-hygiene-inventory.md)
- [GitHub triage guide](./docs/github-triage.md)
- [GitHub label setup](./docs/github-label-setup.md)
- [Final public release gate](./docs/public-release-final-gate.md)
- [Public release history audit](./docs/public-release-history-audit.md)
- [Repository identity](./docs/repository-identity.md)

## License and contribution

- Source code is licensed under [GNU AGPLv3 only](./LICENSE), with package metadata using `AGPL-3.0-only`.
- Educational content is licensed under [CC BY-NC-SA 4.0](./CONTENT_LICENSE.md).
- The Open Model Lab name, logo, icons, domains, and brand assets are all rights reserved under [BRAND.md](./BRAND.md).
- Contribution guidance lives in [CONTRIBUTING.md](./CONTRIBUTING.md).
- Issue templates live in [`.github/ISSUE_TEMPLATE`](./.github/ISSUE_TEMPLATE), and the pull request checklist lives in [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).
- Recommended label definitions live in [`.github/labels.yml`](./.github/labels.yml); setup notes live in [docs/github-label-setup.md](./docs/github-label-setup.md).
- Private vulnerability reporting guidance lives in [SECURITY.md](./SECURITY.md).
- Contributor conduct expectations live in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

Private automation/operator internals, old private UX audit PDFs, real `wrangler.jsonc`, real `public/ads.txt`, and local translation-memory caches are excluded from this public tree.

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Zod for content and payload validation
- Vitest + Testing Library for tests
- Supabase SSR/Auth + Postgres for account/session/sync storage
- Stripe for Supporter billing backed by the existing internal entitlement seam
- OpenNext Cloudflare + Wrangler for preview/deploy flows

## Repo structure

- `app/`: App Router routes, API routes, auth/account/billing flows, trust pages, and discovery/learning surfaces
- `components/concepts/`: shared concept-page framework and concept teaching surfaces
- `components/simulations/`: simulation shell, renderers, controls, readouts, and concept-specific simulation modules
- `components/progress/`, `components/account/`, `components/share/`, `components/ads/`: learner-state, account, share, and ad UI seams
- `content/catalog/`: canonical concept, topic, track, challenge, and guided metadata
- `content/concepts/`: authored rich concept content
- `lib/content/`: schemas, loaders, generated registry, and content selectors
- `lib/progress/`: local progress model, selectors, continue-learning state, and sync adapters
- `lib/account/`: session resolution, entitlement derivation, dev harness, and account storage helpers
- `lib/billing/`: Stripe checkout, portal, webhook, and billing-profile helpers
- `lib/ads/`: ad placement policy, provider config, and placement resolution
- `lib/share-links.ts`: exact-state and share-link helpers
- `lib/feedback*.ts`: feedback payload shaping, rate limiting, and delivery
- `tests/`: account, ads, billing, app routes, content, learning, progress, feedback, metadata, and share-link coverage
- `supabase/migrations/`: current account sync, entitlement, and billing-profile tables
- `docs/`: content authoring, concept framework, account-sync local setup, feedback triage, and launch-readiness docs

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The content registry is regenerated automatically before `dev`, `lint`, `test`, `build`, `preview`, and deploy commands. If you are working directly on content/catalog files and need to refresh it manually, run:

```bash
pnpm content:registry
```

## Local development and optional vendor setup

Most contributors only need `pnpm install`, `pnpm dev`, and the validation commands below. The deterministic dev harness is available for local account-state QA without real vendor accounts: enable `ENABLE_DEV_ACCOUNT_HARNESS=true` and use `/dev/account-harness`.

Vendor setup docs are for maintainers/operators of the official deployment, or for independent fork operators using their own accounts and branding. They are not instructions for deploying an official Open Model Lab clone.

- For Supabase auth, progress sync, entitlement rows, and magic-link redirect setup, see [docs/account-sync-local-setup.md](./docs/account-sync-local-setup.md).
- For launch-sensitive env vars and manual vendor steps for Stripe, AdSense, Resend, metadata, and trust pages, see [docs/launch-readiness.md](./docs/launch-readiness.md).
- For Cloudflare preview/deploy work, provide private Wrangler config through `OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT` or `OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE`, then run `pnpm wrangler:check` and `pnpm deploy:prepare` in the private deploy environment. Workers Builds should run OpenNext after that preparation, not plain `pnpm build`; use the explicit drawer commands or `pnpm cloudflare:build` from [docs/launch-readiness.md](./docs/launch-readiness.md#cloudflare--opennext-private-config). The helper writes ignored `wrangler.jsonc` without printing the config.
- For AdSense on an independently operated deployment, keep the real `public/ads.txt` private and ignored. Use `public/ads.example.txt` as the format reference and `pnpm ads:write` to materialize the real file from private env or a private source file.

Fork operators are responsible for their own Supabase project, Stripe products/prices/webhooks, Resend sender/domain setup, AdSense account/slot IDs/consent obligations, Cloudflare configuration, legal policies, and brand compliance.

## Verify

```bash
pnpm lint
pnpm public-release:hygiene
pnpm public-release:final-check
pnpm public-release:history-audit
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

`pnpm exec tsc --noEmit` is important here: the current Next build config skips TypeScript build errors, so `pnpm build` is not a substitute for a real typecheck.

## Useful routes

- `/concepts`
- `/concepts/topics`
- `/guided`
- `/tracks`
- `/challenges`
- `/pricing`
- `/account`
- `/contact`
- `/privacy`
- `/terms`
- `/ads`
- `/dev/account-harness` when enabled locally
