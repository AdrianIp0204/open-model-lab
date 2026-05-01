# Public Release Final Gate

This is the final pre-visibility checklist for Open Model Lab. Changing repository visibility remains a manual owner action outside this repository. This document does not make the repo public and does not change product behavior.

## Repo-Facing Policy Files

- [x] Code license exists: `LICENSE` with `AGPL-3.0-only` scope.
- [x] Educational content license exists: `CONTENT_LICENSE.md` with `CC-BY-NC-SA-4.0` scope.
- [x] Brand policy exists: `BRAND.md` reserves Open Model Lab names, logos, marks, domains, and visual identity assets.
- [x] Contribution guidance exists: `CONTRIBUTING.md`.
- [x] Security reporting guidance exists: `SECURITY.md`.
- [x] Conduct guidance exists: `CODE_OF_CONDUCT.md`.
- [x] GitHub issue templates exist under `.github/ISSUE_TEMPLATE/`.
- [x] Pull request template exists at `.github/PULL_REQUEST_TEMPLATE.md`.
- [x] Triage guidance exists at `docs/github-triage.md`.
- [x] Label source exists at `.github/labels.yml`.
- [x] Label setup instructions exist at `docs/github-label-setup.md`.
- [x] Recommended GitHub labels were synced from `.github/labels.yml` during the pre-release label pass.
- [x] Public history audit exists at `docs/public-release-history-audit.md`.
- [x] Detailed repo/agent guidance exists at `AGENTS.md`.

## Private Config Boundary

- [x] `.env.example` exists and should remain placeholder-only.
- [x] Real `wrangler.jsonc` is ignored and must remain untracked.
- [x] Real `public/ads.txt` is ignored and must remain untracked.
- [x] `wrangler.example.jsonc` is tracked and placeholder-only.
- [x] `public/ads.example.txt` is tracked and placeholder-only.
- [x] Private automation/operator internals are removed from the curated public tree.
- [x] Root private UX audit PDFs are removed from the curated public tree.
- [x] Locale translation-memory caches are ignored and not tracked.
- [ ] Review selected git history for previously committed secrets or private vendor identifiers. Rotate anything real that was ever exposed.
- [ ] Create the clean orphan public branch from the curated tree, or explicitly accept a different history posture.
- [ ] Confirm ignored local files such as `.env.local`, `.dev.vars`, real `wrangler.jsonc`, and real `public/ads.txt` are not staged.

## Final Verification Commands

Run these before changing visibility:

```bash
pnpm public-release:hygiene
pnpm public-release:final-check
pnpm public-release:history-audit
pnpm github:labels:plan
pnpm lint
pnpm typecheck
pnpm test
```

Add targeted Playwright or manual browser checks for any route-visible change made after this gate.

## GitHub Settings To Review Manually

- [x] Create recommended labels from `.github/labels.yml` for the current GitHub repository.
- [ ] Confirm issue templates render correctly.
- [ ] Confirm `SECURITY.md` renders and public issue templates redirect vulnerabilities privately.
- [ ] Review existing GitHub Actions and disable, restrict, or keep them intentionally.
- [ ] Configure branch protection if desired.
- [ ] Require pull request reviews if desired.
- [ ] Require status checks once the owner chooses the CI signal to enforce.
- [ ] Enable Dependabot and security alerts if the owner wants those signals.
- [ ] Confirm repository description, topics, and public README presentation are accurate.

## Product And Deployment Manual Checks

- [ ] Confirm live site still works for home, concepts, tools, tests, pricing, account, billing return, ads-disabled, and feedback routes.
- [ ] Confirm Supporter/public copy and internal `premium` compatibility wording remain intentional.
- [ ] Confirm no product behavior, billing behavior, webhook logic, migrations, or entitlement values changed as part of release preparation.
- [ ] Confirm production deploy has private `wrangler.jsonc` values supplied outside the repo.
- [ ] If ads are enabled, confirm production setup materializes private `public/ads.txt` before upload.
- [ ] Confirm screenshots, docs, and examples contain no private accounts, private URLs, dashboard exports, billing identifiers, or user data.
- [ ] Confirm old private UX review PDFs and private automation/operator files are absent from the public snapshot.
- [ ] Confirm final visibility timing with the owner.
