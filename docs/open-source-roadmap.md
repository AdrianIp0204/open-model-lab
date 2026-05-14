# Public-Source Roadmap

Status update: as of **2026-05-14**, Open Model Lab is being repositioned as a public-source, public-good interactive STEM learning project rather than a money-first product lane.

The active repository is `AdrianIp0204/open-model-lab`. It is the source of truth for public-facing development, contribution intake, and future issue/PR work. The private historical/archive repository remains separate and must not be treated as the active development base.

## Current Status

- The active source repository exists at `AdrianIp0204/open-model-lab` and is prepared for public visibility once the owner intentionally flips GitHub visibility.
- The private `AdrianIp0204/OpenModelLab` repository is retained only as historical/private archive context and must remain private unless the owner explicitly changes strategy later.
- Code, educational-content, and brand boundaries are documented in `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.
- Contribution, security, and conduct documents are present in `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- GitHub issue templates, a pull request checklist, and triage guidance are present in `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, and `docs/github-triage.md`.
- GitHub label definitions and setup notes are present in `.github/labels.yml` and `docs/github-label-setup.md`.
- The public-good contribution lanes live in `docs/public-good-contribution-lanes.md`.
- The final public-release gate is `docs/public-release-final-gate.md`.
- The current non-destructive tree/history audit is recorded in `docs/public-release-history-audit.md`.
- Real `wrangler.jsonc` and `public/ads.txt` are private/ignored; committed examples document the setup shape without exposing deployment topology or AdSense seller metadata.
- Public product copy should emphasize free core learning, simulation-first concept pages, and optional Supporter/vendor integrations for sustainability.
- The internal entitlement seam remains `free | premium` until a separate migration plan says otherwise.

## Public-Good Direction

The project should present itself as an interactive science atlas for students:

- concept pages should behave like guided live lessons or small scientific instruments;
- explanations, simulations, checks, and challenges should reinforce one another;
- core learning should remain free and useful without sign-in;
- local-first progress should work before account sync;
- Supporter/vendor integrations should be framed as sustainability and hosted-operator convenience, not as the purpose of the project.

## Ongoing Source Safety

- Keep `docs/repository-identity.md`, `AGENTS.md`, `CONTRIBUTING.md`, and `README.md` aligned with the current public-source stance.
- Re-run the final secret/history gate on the exact commit that will become public.
- Keep `.env.example`, `wrangler.example.jsonc`, and `public/ads.example.txt` placeholder-only and aligned with live runtime seams.
- Keep real `wrangler.jsonc`, real `public/ads.txt`, `.env.local`, `.dev.vars`, local database output, logs, screenshots, and browser/build artifacts ignored and untracked.
- Keep the published code, educational-content, and brand/trademark terms aligned with `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.
- Keep contribution docs, security reporting, and conduct expectations aligned with the actual maintainer process.
- Keep GitHub labels synced from `.github/labels.yml` if label definitions change.
- Preserve the clean public history posture; do not push old private branches, tags, or history into the public repository.
- Do not base new public-facing work on stale branches from `AdrianIp0204/OpenModelLab`; branch from active `main`.
- Run CI, `pnpm public-release:final-check`, `pnpm public-release:history-audit`, and smoke checks before release-sensitive repository changes.

## Protected Boundaries

The public source tree must not expose:

- real API keys, webhook secrets, service-role keys, dashboard exports, or deployment credentials;
- private Stripe, Supabase, Resend, Cloudflare, AdSense, or account records;
- private customer, learner, support, or feedback data;
- local database dumps, logs, generated reports, or screenshots with private data;
- brand, logo, product-name, or domain rights reserved under `BRAND.md`.

## What Is Not Changing In This Roadmap

- Core learning remains free: concept pages, simulations, tools, guided paths, challenges, and basic practice are not being moved behind a paywall.
- The Supporter plan remains the public sustainability and convenience layer.
- Stripe-hosted billing, Supabase-backed account sync, webhook handling, and reward-discount behavior remain intact.
- The internal `free | premium` entitlement values remain technical compatibility names for now.
- Ads remain bounded by the existing ad policy and placement registry.

## Working Rule

Public-source preparation should stay practical and evidence-backed. Update docs, samples, safety checks, and release boundaries before claiming public readiness. Product behavior, billing behavior, database shape, entitlement values, and webhook logic need separate tasks if they ever change.
