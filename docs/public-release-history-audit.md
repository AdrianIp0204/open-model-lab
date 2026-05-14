# Public Release History Audit

This is a non-destructive audit for the final pre-public-visibility decision. It does not rewrite history, delete files, change repository visibility, or inspect ignored private file contents.

Latest local audit: **2026-05-14**.

## Current Verdict

The current public-source tree is technically close to ready for public visibility.

- The working tree was clean on `main` during the audit.
- The active remote was `https://github.com/AdrianIp0204/open-model-lab.git`.
- Current tracked-file and history checks found no forbidden tracked release artifacts.
- Current and historical high-confidence secret-pattern scans found no matches.
- Real local deployment files remain ignored/untracked and their contents were not printed.
- The remaining pre-public work is mostly positioning/docs alignment and a final gate on the exact commit that will become public.

## Current-Tree Snapshot

- Active repo: `AdrianIp0204/open-model-lab`.
- Active branch: `main`.
- Current tracked private/config-like files are limited to intentional placeholders such as `.env.example`, `wrangler.example.jsonc`, `public/ads.example.txt`, and sanitized `supabase/migrations/**`.
- Real private files such as `.env.local`, `.dev.vars`, `wrangler.jsonc`, `public/ads.txt`, `.next`, `.open-next`, `.wrangler`, `output`, `tmp`, `test-results`, `node_modules`, and local Supabase output are ignored/untracked.
- `AGENTS.md` remains tracked intentionally as detailed public-safe project and validation guidance.

## Safe And Intended Public Repo Files

| Path or pattern | Reason | Action |
| --- | --- | --- |
| `app/**`, `components/**`, `hooks/**`, `i18n/**`, `lib/**`, `messages/**` | Product source for routes, components, runtime helpers, i18n, ads, account, billing, and support seams. | Retain. |
| `content/catalog/**`, `content/concepts/**`, `content/optimized/**`, `content/i18n/**` | Educational content and localized overlays covered by `CONTENT_LICENSE.md` unless excluded. | Retain, subject to normal content review. |
| `tests/**`, `tests/e2e/**`, Playwright/Vitest configs | Public tests are useful for contributors and release confidence. | Retain. |
| `.github/ISSUE_TEMPLATE/**`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/labels.yml` | Public contribution intake files. | Retain. |
| `.github/workflows/**` | CI workflows use standard setup actions and no committed secrets. | Retain after owner reviews Actions posture in GitHub settings. |
| `LICENSE`, `CONTENT_LICENSE.md`, `BRAND.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` | Public policy and contribution boundary files. | Retain. |
| `.env.example`, `wrangler.example.jsonc`, `public/ads.example.txt` | Placeholder-only setup examples. | Retain; keep real private files ignored. |
| `public/branding/**`, `logo/**`, `public/favicon.ico`, `public/og-default.svg` | Runtime branding and metadata assets. | Retain with `BRAND.md` all-rights-reserved boundary. |
| `AGENTS.md` | Intentional repo guidance, not a temporary agent artifact. | Retain. |

## Must Stay Private Or Ignored

| Path or pattern | Reason |
| --- | --- |
| `.env.local`, `.env*` except `.env.example` | Local environment values and secrets. |
| `.dev.vars*` except a deliberate example file | Local Cloudflare/Wrangler values. |
| `wrangler.jsonc` | Real deployment config. |
| `public/ads.txt` | Real AdSense seller metadata. |
| `.next/**`, `.open-next/**`, `.wrangler/**`, `node_modules/**`, local Supabase output | Local build, dependency, deployment, or database output. |
| `output/**`, `.playwright-cli/**`, `tests/e2e/output/**`, `tmp/**`, `test-results/**` | Local QA, browser, and automation run output. |
| `*.tsbuildinfo`, `*.log`, `*.dmp`, `*.har`, `*.webm`, `*.trace.zip` | Local build/debug/browser artifacts. |
| `content/i18n/*/.translation-memory.json` | Local/offline translation-cache state. Runtime localized bundles remain checked in. |

## Current History Audit Findings

Run before public visibility:

```bash
pnpm public-release:history-audit
```

The 2026-05-14 audit reported:

- 82 commits across refs included in the local scan.
- Refs included: `origin`, `origin/main`, local `main`, and a local `fix/mobile-dark-locale-links` branch.
- No tracked artifact-like paths.
- No historical artifact-like paths.
- Historical private/config-like paths were limited to `.env.example` and `supabase/migrations/**`.
- Large historical objects were generated content/i18n artifacts, not private browser output or deployment files.
- No tags were observed.

This is materially cleaner than the older pre-cleanup history notes. If new branches/tags are added before public visibility, rerun this audit and update the finding.

## Secret Scan Expectations

Before changing visibility, run a final high-confidence secret scan on the exact commit to be made public. At minimum check current tracked files and `git rev-list --all` history for obvious private keys/tokens. Do not print ignored private file contents.

The 2026-05-14 readiness audit found no high-confidence current/history secret-pattern matches and no high-confidence matches in `.env.example`, `wrangler.example.jsonc`, or `public/ads.example.txt`.

## Final Pre-Public Gate

On the exact commit that will be made public, run:

```bash
git status --short --branch
pnpm public-release:hygiene
pnpm public-release:final-check
pnpm public-release:history-audit
pnpm lint
pnpm typecheck
pnpm test
pnpm content:doctor
```

If route-visible behavior has changed, add the relevant Playwright lane. If visibility/settings are about to change on GitHub, also confirm issue templates, labels, branch protection, security alerts, and private vulnerability reporting settings.

## Rollback / Caution

Changing GitHub visibility is external and user-visible. Do it only after owner approval on the final checked commit.

Do not rewrite history or delete remote branches/tags without a separate explicit owner decision and backup plan.
