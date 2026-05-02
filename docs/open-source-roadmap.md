# Open-Source Roadmap

Open Model Lab now has a clean public source repository at `AdrianIp0204/open-model-lab`. This roadmap records the preparation decisions and ongoing public-source maintenance boundaries. It does not change the product's billing and entitlement behavior.

## Current Status

- The clean public source repository exists at `AdrianIp0204/open-model-lab`.
- The private working/archive repository remains `AdrianIp0204/OpenModelLab` and must remain private unless the owner explicitly changes strategy later.
- Final code, educational-content, and brand boundaries have been chosen and documented in `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.
- Initial contribution, security, and conduct documents are now present in `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- GitHub issue templates, a pull request checklist, and triage guidance are now present in `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, and `docs/github-triage.md`.
- GitHub label definitions and setup notes are now present in `.github/labels.yml` and `docs/github-label-setup.md`.
- Recommended GitHub labels have been synced on the current GitHub repository from `.github/labels.yml`.
- The final public-release gate is now `docs/public-release-final-gate.md`.
- A non-destructive current-tree and history audit is now recorded in `docs/public-release-history-audit.md`.
- The curated public tree no longer tracks private automation/operator internals, old private UX audit PDFs, or locale translation-memory caches.
- `AGENTS.md` remains detailed public-safe project and validation guidance.
- Repository identity rules live in `docs/repository-identity.md`.
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

## Ongoing Public-Repo Safety

- Keep `docs/repository-identity.md`, `AGENTS.md`, and README positioning aligned so public-source work does not drift into private operations.
- Complete a secret audit across the working tree, ignored files, deployment files, logs, generated artifacts, screenshots, and selected git history.
- Keep `.env.example` and any other sample env files placeholder-only and aligned with the live runtime seams.
- Keep `wrangler.example.jsonc` and `public/ads.example.txt` placeholder-only, with real `wrangler.jsonc` and `public/ads.txt` supplied privately.
- Keep the published code, educational-content, and brand/trademark terms aligned with `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.
- Keep contribution docs, security reporting, and conduct expectations aligned with the actual maintainer process.
- Keep GitHub labels synced from `.github/labels.yml` if label definitions change.
- Preserve the clean public history posture; do not push old private branches, tags, or history into the public repository.
- Review README claims so the public landing document matches what is implemented now.
- Recheck generated files and ignored files so public artifacts are intentional.
- Run CI, `pnpm public-release:final-check`, `pnpm public-release:history-audit`, and smoke checks before release-sensitive repository changes.

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
