# Contributing To Open Model Lab

Open Model Lab is public source software. These guidelines describe the expected contribution path. They do not change the current product behavior, billing model, or entitlement values.

## Useful Contribution Scope

Contributions that are usually welcome include:

- bug fixes
- accessibility fixes
- documentation improvements
- localized copy improvements
- educational content corrections
- focused tests
- small UI polish that fits the existing design system

Please open a discussion or issue before working on:

- billing, Stripe, Supporter checkout, or webhook behavior
- entitlement gates or internal `free | premium` values
- auth, session, account sync, or Supabase storage
- database migrations
- ad policy, AdSense placement, or `ads.txt`
- major redesigns
- new large simulations, tools, or content systems
- license, brand, trademark, security, or contribution-policy changes

## Issue And Pull Request Intake

Use the issue templates under `.github/ISSUE_TEMPLATE/` and the pull request checklist at `.github/PULL_REQUEST_TEMPLATE.md`. Triage labels and maintainer routing guidance live in `docs/github-triage.md`, with label setup details in `docs/github-label-setup.md`.

Do not open public issues for vulnerabilities, private account support, billing support, or user-data questions. Use `SECURITY.md` for suspected vulnerabilities and the live contact page for account or billing support.

Before opening larger changes, verify that you are working in `AdrianIp0204/open-model-lab`, the active public source of truth. The private `AdrianIp0204/OpenModelLab` repository is historical/archive-only and should not be used for new public-facing development. The repo identity guide lives in `docs/repository-identity.md`.

## Local Setup

Use Node and pnpm matching the repo's `packageManager` field.

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` for local development and fill only local or test values. Do not commit real secrets, private keys, vendor dashboard exports, database dumps, `.env.local`, or `.dev.vars`.

Ordinary code, docs, content, test, accessibility, and localization contributions do not require production Supabase, Stripe, Resend, AdSense, or Cloudflare setup. Vendor setup docs are for maintainers/operators or independent forks using their own accounts, branding, domains, and legal policies.

For deterministic local account QA, enable the dev harness only in local development:

```bash
ENABLE_DEV_ACCOUNT_HARNESS=true
```

Then use `/dev/account-harness` to check signed-out, signed-in free, and internally premium fixture states.

## Validation

Run the smallest truthful lane for the change, then broaden when the touched surface warrants it.

Core checks:

```bash
pnpm content:registry
pnpm lint
pnpm typecheck
pnpm test
pnpm public-release:hygiene
pnpm public-release:final-check
pnpm public-release:history-audit
```

Use targeted Playwright lanes when route-visible UI, account flows, assessment journeys, concept-page behavior, billing return surfaces, or ad placement behavior changes.

Useful focused lanes:

```bash
pnpm test:e2e:assessment
pnpm test:e2e:concept-v2
pnpm i18n:check:zh-HK
pnpm validate:content
pnpm content:doctor
```

Public PR validation does not require deployment secrets. The `Public Validation` workflow runs public-release hygiene, label-plan, lint, typecheck, and unit/component tests. The assessment browser workflow runs the same assessment coverage in smaller `journeys`, `resume-sync`, and `entry-recommendations` lanes so each status check stays suitable for branch protection.

`pnpm build` is not a substitute for type checking in this repo. Use `pnpm typecheck` for TypeScript validation.

## Repo Conventions

- Keep changes bounded to the task and the owning seam.
- Preserve the free core learning plus optional Supporter convenience boundary.
- Keep public copy aligned with Supporter-funded sustainability.
- Keep internal `premium` entitlement naming unless a dedicated migration task explicitly changes it.
- Do not remove Stripe, Supabase, Resend, AdSense, billing, reward, or Supporter infrastructure in ordinary cleanup work.
- Keep `AGENTS.md` useful and detailed if you edit it. It is intentional repo guidance, unlike local agent-run artifacts.
- Do not commit root review PDFs, local browser/QA artifacts, real `wrangler.jsonc`, real `public/ads.txt`, or locale translation-memory caches.
- Do not hand-edit `lib/content/generated/content-registry.ts` or `lib/i18n/generated/content-bundle.ts`; regenerate them through the existing scripts.
- Keep generated content, localized overlays, and manifests aligned when changing content or i18n files.
- Use existing shared helpers and route seams instead of adding parallel auth, billing, progress, ad, content, or localization systems.
- Protect secrets and private data.
- Use Conventional Commits, for example `fix(account): repair session refresh` or `docs(content): clarify quiz authoring`.

## Content Contributions

Canonical English content lives in:

- `content/concepts/**`
- `content/catalog/**`

Optimized English overlays live in `content/optimized/**`. Locale overlays live in `content/i18n/**` and have their own validation workflow.

Content changes should be accurate, reviewable, and specific. Prefer small corrections with clear evidence over broad rewrites. Do not localize IDs, slugs, storage keys, analytics keys, or route identities.

## Security Issues

Do not report vulnerabilities in public issues. Use `SECURITY.md` for private reporting guidance.

## Licenses And Brand

Code, educational content, and brand assets have separate terms:

- source code: `LICENSE`
- educational content: `CONTENT_LICENSE.md`
- Open Model Lab name, logo, and brand assets: `BRAND.md`
