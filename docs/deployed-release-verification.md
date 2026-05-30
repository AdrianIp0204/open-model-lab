# Deployed Release Verification

Use this after Cloudflare upload/deploy, or against a Cloudflare preview URL before promotion. The goal is to prove the deployed origin is serving the commit that was just built and that the live zh-HK UX is release-ready, not merely reachable.

## Build Marker

Every deploy should expose a public commit marker at `/api/deployment`. Set one of these non-secret build/runtime variables during the OpenNext build:

```bash
NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA="$(git rev-parse HEAD)"
NEXT_PUBLIC_OPEN_MODEL_LAB_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

`OPEN_MODEL_LAB_COMMIT_SHA`, `CF_PAGES_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA`, and `COMMIT_SHA` are accepted fallbacks, but the `NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA` name is the clearest operator contract for Cloudflare builds. Do not put secrets in these marker variables.

## Required Release Checklist

Run the local release gates from the same checkout that will be deployed:

```bash
pnpm i18n:validate -- --locale zh-HK
pnpm i18n:sweep:zh-HK -- --autostart
pnpm i18n:sweep:zh-HK:semantic -- --autostart
pnpm theme:sweep:light-dark
```

After upload/deploy, run the live-origin check against production or the Cloudflare preview URL:

```bash
OPEN_MODEL_LAB_RELEASE_BASE_URL="https://openmodellab.com" \
OPEN_MODEL_LAB_EXPECTED_COMMIT="$(git rev-parse HEAD)" \
pnpm release:verify:deployed
```

For a preview URL, replace `OPEN_MODEL_LAB_RELEASE_BASE_URL` with the Cloudflare preview origin before promotion.

The deployed verifier writes a concise artifact under:

```text
output/deployed-release-verification/<timestamp>/summary.json
```

That artifact includes the live marker, HTTP route checks, Playwright route checks, semantic zh-HK findings, light/dark contrast findings, screenshots, and explicit follow-up candidates for any failure. A deploy is not release-ready until the artifact is green or each failure has a tracked follow-up.

## What The Live Verifier Checks

- `/api/deployment` returns a public commit or deployment marker and matches `OPEN_MODEL_LAB_EXPECTED_COMMIT`.
- `curl`-equivalent HTTP checks reach `/`, `/en`, `/zh-HK`, `/zh-HK/concepts`, `/zh-HK/start`, `/zh-HK/search?q=force`, and `/zh-HK/concepts/derivative-as-slope-local-rate-of-change`.
- Playwright opens representative zh-HK routes at desktop, tablet, and phone viewports.
- `html lang` stays `zh-HK` on zh-HK routes.
- Visible runtime error pages and hydration/runtime error text are absent.
- Semantic zh-HK quality checks flag protected-token corruption, message-key leaks, untranslated accessible labels, mojibake, simplified-character leaks, and generic filler clusters.
- Light and dark theme sweeps catch low text contrast on representative live surfaces.
