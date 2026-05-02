# GitHub Triage Guide

Open Model Lab uses this guide for public issue and pull request triage. It documents recommended issue labels and triage boundaries. It does not create labels automatically and does not change product behavior.

The label source of truth is `.github/labels.yml`. Setup instructions live in `docs/github-label-setup.md`.

## Issue Templates

Use the templates under `.github/ISSUE_TEMPLATE/` for public intake:

- bug reports
- educational content corrections
- accessibility issues
- localization issues
- feature requests
- documentation issues

Security reports must be redirected to `SECURITY.md` and handled privately. Do not discuss suspected vulnerabilities in public issue comments.

## Recommended Labels

Use `.github/labels.yml` for exact names, colors, and descriptions.

Type labels:

- `type: bug` - product or code defects
- `type: content` - educational content corrections
- `type: docs` - README, docs, setup, or contributor guidance
- `type: accessibility` - keyboard, screen-reader, contrast, motion, or related barriers
- `type: localization` - translation, locale routing, or localized wording
- `type: feature` - feature proposals or product improvements
- `type: security` - private security-triage placeholder only; redirect public details to `SECURITY.md`

Area labels:

- `area: concepts`
- `area: simulations`
- `area: tools`
- `area: circuit-builder`
- `area: chemistry-map`
- `area: tests`
- `area: account`
- `area: billing`
- `area: ads`
- `area: i18n`
- `area: infrastructure`

Priority labels:

- `priority: low` - useful but not urgent
- `priority: medium` - normal tracked work
- `priority: high` - important user-facing defect, release blocker, or safety concern

Workflow labels:

- `good first issue` - small, well-scoped work with a clear owner-approved direction
- `needs owner decision` - blocked on policy, product, license, brand, billing, security, or architecture direction
- `blocked` - blocked by an external dependency, missing information, or another task
- `wontfix` - intentionally declined after maintainer review

## Triage Rules

- Redirect public vulnerability reports to `SECURITY.md`. Do not ask for exploit details in public comments.
- Redirect private account, billing, subscription, payment, or user-data support requests to the contact path instead of keeping them in public issues.
- Billing, entitlement, auth, security, license, brand, ad-policy, and database-migration changes need owner review before implementation.
- Content corrections should include the affected page or concept plus evidence where possible.
- Localization issues should include the locale, current wording, suggested wording, and whether the issue changes meaning or tone.
- Feature requests are not commitments. Mark unclear or policy-sensitive requests as `needs owner decision`.
- Use `good first issue` only when the desired fix is clear and unlikely to touch protected product seams.

## Pull Requests

Use `.github/PULL_REQUEST_TEMPLATE.md`. PRs should list checks run and confirm that no real `wrangler.jsonc`, real `public/ads.txt`, secrets, private data, or unsafe screenshots are included.
