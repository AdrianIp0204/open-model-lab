# Public Release Safety Checklist

Use this checklist before changing repository visibility or publishing a public source snapshot. A clean working tree is not enough; ignored files, deployment config, generated artifacts, and selected history still need review.

## Secrets And Environment Variables

- [ ] Confirm no local `.env*` or `.dev.vars*` files are tracked or staged, except approved placeholder example files.
- [ ] Scan the working tree for service-role keys, private API keys, webhook secrets, dashboard exports, local database dumps, and customer records.
- [ ] Review selected git history for previously committed secrets. If any real secret was ever committed, rotate it before release.
- [ ] Confirm public examples use placeholders only.
- [ ] Confirm CI and deployment secrets live in the vendor secret store, not in committed config.

## `.env.example`

- [ ] Keep `.env.example` aligned with live runtime env names.
- [ ] Use local defaults or placeholder values only.
- [ ] Do not include real Stripe price IDs, webhook secrets, Supabase service-role keys, Resend keys, AdSense publisher IDs, private URLs, or personal inboxes.
- [ ] Mark optional feature toggles clearly, especially ads, analytics, support links, and dev harness settings.

## Git History Limitations

- [ ] Treat current file contents and history as separate audits.
- [ ] Do not rely on `.gitignore` to protect values that were already committed.
- [ ] Rotate exposed credentials instead of only rewriting history.
- [ ] If history cleanup is required, document the operational impact before force-pushing or replacing public history.

## Stripe, Supabase, Resend, And AdSense

- [ ] Confirm Stripe secret keys and webhook secrets are not committed.
- [ ] Confirm Supabase service-role keys and private database exports are not committed.
- [ ] Confirm Resend API keys and private sender verification material are not committed.
- [ ] Confirm real AdSense seller metadata is supplied privately or at deploy time, not committed as `public/ads.txt`.
- [ ] Review whether public vendor identifiers, price IDs, coupon IDs, publisher IDs, and slot IDs are safe to disclose or should be moved out of committed config before release.
- [ ] Confirm Supporter billing remains implemented through the existing Stripe-hosted flow and webhook-backed entitlement updates.

## Generated And Local-Only Files

- [ ] Confirm generated content artifacts are intentionally checked in or intentionally ignored according to current repo rules.
- [ ] Review `docs/public-release-hygiene-inventory.md` for removed artifact classes and remaining owner-decision items.
- [ ] Run `pnpm public-release:hygiene` and resolve any forbidden tracked local output, browser reports, traces, screenshots, coverage, temporary files, or package-manager caches.
- [ ] Confirm `supabase/` local database output is not staged.
- [ ] Confirm `automation/**`, private automation docs, root private UX audit PDFs, and locale translation-memory caches are absent from the public snapshot.

## User Data, Logs, Screenshots, And Assets

- [ ] Remove or redact learner data, support messages, customer records, test inboxes, and analytics payloads.
- [ ] Check screenshots for emails, account IDs, dashboard URLs, billing identifiers, and private browser state.
- [ ] Confirm third-party assets have redistribution rights or are excluded.
- [ ] Keep brand/logo rights separate from code and educational-content licensing.

## Deployment Files

- [ ] Keep the real `wrangler.jsonc` private and ignored; commit only `wrangler.example.jsonc`.
- [ ] Review `wrangler.example.jsonc`, OpenNext config, and deployment docs for public/private boundary issues.
- [ ] Keep deployment secrets in Cloudflare or CI secret stores, not committed files.
- [ ] Review any committed production-like public variables before release and document whether they are intentionally public.
- [ ] Confirm preview and production route behavior still matches launch-readiness docs.

## Current Review Classes Noted During Prep

- [ ] Review `docs/public-release-decision-memo.md` and `docs/public-release-history-audit.md` before making final owner calls on history cleanup and repository visibility timing.
- [ ] Use `docs/public-release-hygiene-inventory.md` as the current inventory for retained, removed, and owner-decision public-release hygiene findings.
- [ ] Confirm tracked `wrangler.jsonc` and tracked real `public/ads.txt` are absent; `pnpm public-release:hygiene` should fail if either returns.
- [ ] Confirm `wrangler.example.jsonc` and `public/ads.example.txt` remain placeholder-only.
- [ ] Confirm `AGENTS.md` remains tracked as detailed repo/agent guidance and is not confused with local agent-run artifacts.
- [ ] Confirm private automation/operator files and old private UX audit PDFs remain removed from current HEAD.
- [ ] Confirm `content/i18n/*/.translation-memory.json` remains ignored local cache state, not tracked runtime content.
- [ ] Review AdSense disclosure surfaces such as `docs/adsense-manual-ads.md` for placeholder-only examples and the private materialization workflow.
- [ ] Keep removed local artifact classes such as `output/`, `.playwright-cli/`, `tmp/`, browser profiles, screenshots, crash dumps, and local QA reports out of tracking.
- [ ] Keep local ignored environment files such as `.env.local` and `.dev.vars` out of staging and commits.

## Public README Readiness

- [ ] Confirm README says the project is preparing for public open-source release rather than already claiming final open-source status.
- [ ] Link to the roadmap, monetization boundaries, and this checklist.
- [ ] Keep setup instructions truthful for a new external reader.
- [ ] Avoid promises about governance, community support, public roadmap process, or security response until the supporting files exist.

## License, Contribution, And Security Docs

- [x] Choose and commit final code license terms.
- [x] Choose and commit final educational-content license terms.
- [x] Add brand/trademark usage notes if brand assets or names remain protected.
- [x] Add `CONTRIBUTING.md` with setup, scope, review, and content-authoring guidance.
- [x] Add `SECURITY.md` with private reporting instructions.
- [x] Add `CODE_OF_CONDUCT.md` for the current owner/maintainer moderation model.
- [x] Add GitHub issue templates, a pull request template, and public triage guidance.
- [x] Add `.github/labels.yml` and label setup guidance.
- [x] Add `docs/public-release-final-gate.md`.
- [x] Add `docs/public-release-history-audit.md`.
- [ ] Add `NOTICE` or third-party attribution files if license review requires them.

## GitHub Intake

- [x] Add `.github/ISSUE_TEMPLATE/config.yml` with security and account/billing redirects.
- [x] Add public issue templates for bug, content, accessibility, localization, feature, and documentation reports.
- [x] Add `.github/PULL_REQUEST_TEMPLATE.md`.
- [x] Add `docs/github-triage.md`.
- [x] Add `.github/labels.yml`.
- [x] Add `docs/github-label-setup.md`.
- [x] Create recommended labels in GitHub from `.github/labels.yml`.
- [ ] Confirm intake docs/templates do not claim the repo is already public and do not invite public vulnerability disclosure.

## Branch Protection And CI

- [ ] Confirm default-branch protection and required checks are configured before public contribution intake.
- [ ] Create the clean orphan public branch from the curated public tree, or explicitly accept a different history posture.
- [ ] Run `pnpm public-release:hygiene`.
- [ ] Run `pnpm public-release:final-check`.
- [ ] Run `pnpm public-release:history-audit`.
- [ ] Run `pnpm github:labels:plan`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run focused Vitest and Playwright lanes relevant to any final release prep changes.
- [ ] Run final smoke checks for home, concepts, tools, pricing, account, billing-return, ads-disabled, and feedback routes.

## Final Release Gate

- [ ] Confirm no product behavior, billing behavior, webhook logic, migrations, or entitlement values changed as part of the docs-only release-prep pass.
- [ ] Confirm Supporter/public copy and internal `premium` compatibility language are both intentional where they appear.
- [ ] Confirm final license claims match the committed `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md` files.
- [ ] Review `docs/public-release-final-gate.md`.
- [ ] Review `docs/public-release-history-audit.md`.
- [ ] Confirm the repo owner has approved the exact public-release state.
