# Public Release Decision Memo

This memo records the public-release policy decisions that led to the clean public source repository. It remains useful as historical context and does not change product behavior.

## Current Readiness Snapshot

- The clean public source repository now exists at `AdrianIp0204/open-model-lab` and is the active source of truth for future development.
- The private `AdrianIp0204/OpenModelLab` repository is retained only as historical/private archive context and must stay private unless the owner explicitly changes strategy later.
- The product model is free core learning plus an optional Supporter convenience layer.
- The internal entitlement seam still uses `free | premium` for technical compatibility across billing, webhooks, stored records, fixtures, tests, and capability checks.
- The public-release hygiene pass removed tracked local browser, output, crash, profile, screenshot, and QA artifacts from the repository.
- `.env.example` exists and is placeholder-only.
- `pnpm public-release:hygiene` exists and checks tracked paths for forbidden local artifacts and secret-looking filenames without printing file contents.
- Final license files, contribution docs, security policy, brand policy, and code-of-conduct docs now exist.
- GitHub issue templates, a pull request checklist, and triage guidance now exist.
- GitHub label definitions and setup instructions now exist, the recommended labels have been synced on GitHub, and the final public-release gate now exists.
- A non-destructive current-tree and history audit now exists in `docs/public-release-history-audit.md`.
- The curated public tree no longer tracks private automation/operator internals, old private UX audit PDFs, or locale translation-memory caches.
- `AGENTS.md` is retained as detailed repo/agent guidance; local agent-run artifacts remain ignored/untracked.
- AdSense repository exposure and Wrangler/Cloudflare config posture are now decided: real files stay private and ignored, while placeholder examples stay committed.
- The clean public history posture has been executed for the public repository. Do not push old private branches, tags, or history into `AdrianIp0204/open-model-lab`, and do not base new public work on stale private-repo branches.
- Repository identity rules now live in `docs/repository-identity.md`.

## AdSense Public Metadata Decision

Relevant surfaces:

- `public/ads.example.txt`
- private ignored `public/ads.txt`
- `scripts/write-ads-txt.mjs`
- `docs/adsense-manual-ads.md`
- AdSense environment variable names in `.env.example`
- The shared ad seams under `lib/ads/*` and `components/ads/*`

`ads.txt` is publicly served by design when a site uses ads. Publisher and seller metadata in that file is not a secret in the same way as an API key, webhook secret, service-role key, or private deployment credential. The live website must make that metadata reachable at `/ads.txt` for the ad ecosystem to verify authorized sellers.

The repo decision is still meaningful because committing the real `ads.txt` line links the public source repository to a specific AdSense publisher or seller identity. The owner has decided not to commit the real file.

Decision:

| Decision | What changed | Tradeoff |
| --- | --- | --- |
| Keep only a placeholder example in source | `public/ads.example.txt` is committed, real `public/ads.txt` is ignored, and `scripts/write-ads-txt.mjs` materializes the real file from private env or a private source file. | Less repository exposure, but operators must provide the real file before production upload. |

Operational rule: run `pnpm ads:check` and `pnpm ads:write` in setup/deploy contexts where AdSense is enabled. Do not commit real seller metadata.

## Wrangler And Cloudflare Config Decision

Relevant surfaces:

- `wrangler.example.jsonc`
- private ignored `wrangler.jsonc`
- `.env.example`
- `docs/launch-readiness.md`
- `docs/prelaunch-staging-checklist.md`
- `docs/platform-stability-checklist.md`

The committed Wrangler example intentionally contains only placeholder/template categories such as:

- project and worker names
- Cloudflare/OpenNext build entry and asset settings
- compatibility date and compatibility flags
- placeholder route/domain references
- placeholder public runtime variable names and values
- placeholder vendor public identifiers such as public site, Supabase, Stripe price/coupon, feedback, and AdSense config values
- service bindings and binding names
- secret-name or required-secret declarations, not secret values
- observability and deployment behavior flags

Do not treat all of these as secrets. Route names, worker names, public URLs, public Supabase anon/publishable values, AdSense client or slot IDs, and Stripe price IDs are often public or semi-public identifiers. They can still reveal deployment topology, vendor relationships, support addresses, or production setup details, so the owner should decide the posture.

Decision:

| Decision | What changed | Tradeoff |
| --- | --- | --- |
| Commit `wrangler.example.jsonc` and ignore real `wrangler.jsonc` | Real deployment values move out of tracked source; the example preserves the OpenNext/Cloudflare shape and placeholder binding/env names. | Less topology exposure, but contributors and operators must create a private config before preview/deploy work. |

Operational rule: copy `wrangler.example.jsonc` to the ignored `wrangler.jsonc` for real preview/deploy work, keep real values private, and set secrets through Cloudflare/Wrangler/CI secret stores.

## Decided License Model

The owner has chosen the final license model for this repository:

- source code: GNU AGPLv3 only, expressed as `AGPL-3.0-only`
- educational content: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International, expressed as `CC-BY-NC-SA-4.0`
- Open Model Lab brand, name, logo, marks, domains, and visual identity assets: all rights reserved

The final repo-facing files are:

- `LICENSE`
- `CONTENT_LICENSE.md`
- `BRAND.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`

`NOTICE` has not been added because this pass did not identify a specific third-party notice requirement.

## Contribution, Security, And Brand Docs

| Document | Purpose | Should include | Depends on |
| --- | --- | --- | --- |
| `LICENSE` | Final code license. | Exact code license text and source-code scope. | Added. |
| `CONTENT_LICENSE.md` | Educational content license. | Scope for concepts, catalogs, copy, exercises, diagrams, generated content artifacts, and exclusions. | Added. |
| `BRAND.md` | Brand and mark boundaries. | Name, logo, domain, screenshot, fork naming, and attribution rules. | Added. |
| `CONTRIBUTING.md` | Contributor setup and review expectations. | Local setup, validation commands, issue scope, coding standards, content-authoring notes, and what is out of scope. | Added. |
| `SECURITY.md` | Private vulnerability reporting path. | Supported versions, report channel, expected response boundaries, and what not to disclose publicly. | Added. |
| `CODE_OF_CONDUCT.md` | Community conduct expectations. | Conduct rules and current owner/maintainer enforcement path. | Added. |
| `NOTICE` | Attribution or third-party notice file. | Required notices if dependency or asset license review requires them. | Not added; no specific notice requirement identified. |
| GitHub issue templates | Triage clarity after public release. | Bug report, content issue, localization issue, feature request, and security redirect templates. | Added. |
| `docs/github-triage.md` | Label and maintainer-routing guidance. | Label meanings, security redirect rule, owner-review boundaries, and triage expectations. | Added. |
| `.github/labels.yml` | Label source of truth. | Recommended labels, colors, and descriptions. | Added. |
| `docs/github-label-setup.md` | Label setup instructions. | Manual setup steps and optional dry-run/apply helper usage. | Added. |
| `docs/public-release-final-gate.md` | Final public-release checklist. | Policy files, private config boundary, verification commands, GitHub settings, and manual deployment checks. | Added. |
| `docs/repository-identity.md` | Public/private repo identity guard. | Public repo purpose, private repo boundary, and required agent/contributor identity checks. | Added. |
| `docs/public-release-history-audit.md` | Current-tree and history cleanup audit. | Current HEAD classifications, historical artifact findings, and rewrite/orphan-branch options. | Added. |

Keep these docs aligned with actual maintainer capacity. Do not imply a larger governance, security, or moderation organization than exists.

## Recommended Next Sequence

1. Keep public-source positioning accurate in README, `AGENTS.md`, and `docs/repository-identity.md`.
2. Keep real deployment config, vendor secrets, real `wrangler.jsonc`, real `public/ads.txt`, and private operator artifacts out of the public repository.
3. Run `pnpm public-release:hygiene`, `pnpm public-release:final-check`, `pnpm public-release:history-audit`, `pnpm lint`, `pnpm typecheck`, and the relevant test/browser lanes for release-sensitive changes.
4. Use `AdrianIp0204/open-model-lab` for public contributions and future development, and keep `AdrianIp0204/OpenModelLab` private as historical/archive context.

## Current Decisions And Non-Decisions

- Decided: source code is `AGPL-3.0-only`.
- Decided: educational content is `CC-BY-NC-SA-4.0`.
- Decided: Open Model Lab brand, name, logo, domains, and visual identity assets are all rights reserved.
- Decided: contribution, security, and conduct docs now exist for public-release preparation.
- Decided: real AdSense seller metadata stays private/untracked; `public/ads.example.txt` and `scripts/write-ads-txt.mjs` are committed.
- Decided: real Wrangler config stays private/untracked; `wrangler.example.jsonc` is committed.
- Decided: GitHub issue templates, pull request template, and triage guidance exist.
- Decided: GitHub label definitions, label setup docs, synced GitHub labels, final release gate docs, and history audit docs exist.
- Decided: private automation/operator internals, old private UX audit PDFs, and locale translation-memory caches are excluded from the curated public tree.
- Decided: `AGENTS.md` remains as detailed repo/agent guidance and is distinct from ignored local agent artifacts.
- Executed: the clean public source repository exists at `AdrianIp0204/open-model-lab` and is the active source of truth.
- Still private by design: `AdrianIp0204/OpenModelLab`, retained only as historical/archive context.
- No product behavior, billing behavior, Stripe webhook behavior, database migration, or entitlement value changes are part of this memo.
