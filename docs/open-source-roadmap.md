# Open-Source Roadmap

Open Model Lab is preparing for a public open-source release. This document is a preparation roadmap only. It does not make the repository public, open contributions, or change the product's billing and entitlement behavior.

## Current Status

- The project is still in private preparation.
- Final code, educational-content, and brand boundaries have been chosen and documented in `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.
- Initial contribution, security, and conduct documents are now present in `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- GitHub issue templates, a pull request checklist, and triage guidance are now present in `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, and `docs/github-triage.md`.
- GitHub label definitions and setup notes are now present in `.github/labels.yml` and `docs/github-label-setup.md`.
- Recommended GitHub labels have been synced on the current GitHub repository from `.github/labels.yml`.
- The final pre-visibility checklist is now `docs/public-release-final-gate.md`.
- A non-destructive current-tree and history audit is now recorded in `docs/public-release-history-audit.md`.
- The curated public tree no longer tracks private automation/operator internals, old private UX audit PDFs, or locale translation-memory caches.
- `AGENTS.md` has been reduced to public-safe project and validation guidance.
- Real `wrangler.jsonc` and `public/ads.txt` are private/ignored; committed examples document the setup shape without exposing deployment topology or AdSense seller metadata.
- Public product copy is moving toward free core learning plus optional Supporter-funded sustainability.
- The internal entitlement seam remains `free | premium` until a separate migration plan says otherwise.

## Why Prepare For Open Source

- Transparency: learners and reviewers should be able to inspect how the educational product works.
- Learning value: the codebase can become a useful reference for simulation-first science learning.
- Contribution path: a public release can make focused fixes, localization, content review, and tooling improvements easier later.
- Trust: clear source, safety, billing, and ad boundaries are easier to evaluate in the open.
- Portfolio value: the product should demonstrate real engineering choices, not only a hosted result.
- Educational reuse: separate license docs make reuse rights understandable without confusing code, content, and brand rights.

## Before Public Release

- Review `docs/public-release-decision-memo.md`, `docs/public-release-final-gate.md`, and `docs/public-release-history-audit.md`, then resolve remaining owner decisions for the clean orphan public branch and repository visibility timing.
- Complete a secret audit across the working tree, ignored files, deployment files, logs, generated artifacts, screenshots, and selected git history.
- Keep `.env.example` and any other sample env files placeholder-only and aligned with the live runtime seams.
- Keep `wrangler.example.jsonc` and `public/ads.example.txt` placeholder-only, with real `wrangler.jsonc` and `public/ads.txt` supplied privately.
- Keep the published code, educational-content, and brand/trademark terms aligned with `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.
- Keep contribution docs, security reporting, and conduct expectations aligned with the actual maintainer process.
- Keep GitHub labels synced from `.github/labels.yml` if label definitions change before visibility changes.
- Create a clean orphan public branch from the curated tree, or explicitly accept a different history posture before changing visibility.
- Review README claims so the public landing document matches what is implemented now.
- Recheck generated files and ignored files so public artifacts are intentional.
- Run final CI, `pnpm public-release:final-check`, `pnpm public-release:history-audit`, and smoke checks before changing repository visibility.

## Protected Boundaries

The public release must not expose:

- real API keys, webhook secrets, service-role keys, dashboard exports, or deployment credentials
- private Stripe, Supabase, Resend, Cloudflare, AdSense, or account records
- private customer, learner, support, or feedback data
- local database dumps, logs, generated reports, or screenshots with private data
- brand, logo, product-name, or domain rights reserved under `BRAND.md`

## What Is Not Changing In This Roadmap

- Core learning remains free: concept pages, simulations, tools, guided paths, challenges, and basic practice are not being moved behind a paywall.
- The Supporter plan remains the public sustainability and convenience layer.
- Stripe-hosted billing, Supabase-backed account sync, webhook handling, and reward-discount behavior remain intact.
- The internal `free | premium` entitlement values remain technical compatibility names for now.
- Ads remain bounded by the existing ad policy and placement registry.

## Working Rule

Public-release preparation should stay practical and evidence-backed. Update docs, samples, safety checks, and release boundaries before claiming public readiness. Product behavior, billing behavior, database shape, entitlement values, and webhook logic need separate tasks if they ever change.
