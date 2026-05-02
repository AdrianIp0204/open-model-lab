# AGENTS.md

## Project Overview
- Open Model Lab is the live product name. Do not introduce new `Physica` naming unless a legacy compatibility seam already uses it intentionally.
- This repo is a real product, not a static prototype. The shipped app is a simulation-first science-learning site with a physics-heavy but genuinely multi-subject catalog, topic/track/guided/challenge/test surfaces, account/auth flows, a paid entitlement seam, billing, achievements/reward, ads, trust pages, server-side feedback delivery, and launch-readiness docs.
- The current product shape is:
  - free core learning product
  - one bounded internal `premium` entitlement layer whose public framing can move toward Supporter/Pro
  - optional sign-in
  - local-first progress by default
  - any signed-in account can sync the canonical progress snapshot across devices
  - paid/supporter-gated convenience features such as saved study tools, exact-state sharing, richer review/analytics, and ad-free browsing
- The current product/repo direction is public source maintenance plus supporter-funded sustainability. Core learning should stay free; paid features should fund and improve the project without walling off the main educational value.

## Repository Source-Of-Truth Guard
- Always confirm whether the checkout is `AdrianIp0204/open-model-lab` or `AdrianIp0204/OpenModelLab` before editing. See `docs/repository-identity.md`.
- `AdrianIp0204/open-model-lab` is the active public development repository and current source of truth for code, docs, issues, PRs, CI, and future public-facing work.
- `AdrianIp0204/OpenModelLab` is a private historical/archive repository only. It must remain private and should not be used for new development unless the owner explicitly says the task is private-archive maintenance.
- For public repo work, operate only in `AdrianIp0204/open-model-lab`. Use public `main` as the current baseline.
- Do not use private repo branches as the base for public work, and do not port private-history branches into the public repo unless the owner explicitly asks for a reviewed cherry-pick.
- Do not pull private history, ignored files, local QA output, deployment config, old artifacts, or private config into the public repo.
- Before editing, report or record:
  - repository full name
  - remote URL
  - current branch
  - HEAD SHA
  - whether the working tree is clean
- If the task references public repo state but the checkout is `AdrianIp0204/OpenModelLab`, stop and switch to `AdrianIp0204/open-model-lab` before editing.
- If the task references private archive state but the checkout is `AdrianIp0204/open-model-lab`, stop and ask for direction.
- `AGENTS.md` is intentional tracked guidance. Local agent artifacts such as `.codex-tmp/`, `output/`, `.codex-*.out`, logs, traces, screenshots, browser profiles, and temporary QA outputs are ignored/untracked and should never be committed.

## Open Source Direction
- This public repo is the clean public source release. Keep it positioned for code reading, learning, issue reports, review, and focused contributions, not as a turnkey official deployment kit.
- Do not imply that the public repo includes the official production deployment setup. Real production config, real `wrangler.jsonc`, real `public/ads.txt`, deployment secrets, vendor dashboards, and private operator history are intentionally absent.
- Fork operators must use their own name, branding, domains, vendor accounts, keys, legal policies, and deployment process. The Open Model Lab name, logo, marks, domains, and official presentation remain reserved under `BRAND.md`.
- Protect secrets and private deployment details. Do not commit real API keys, Stripe IDs, Supabase service-role keys, Resend keys, Cloudflare secrets, private emails beyond intended public support addresses, private user data, customer records, local database dumps, or vendor dashboard exports.
- Keep `.env.example` and similar checked-in example files truthful, minimal, and non-secret. If an example file does not exist yet, do not imply that it does.
- Keep public docs honest about what is implemented now versus planned. Avoid aspirational claims about governance, community support, security response, public roadmap process, or contributor experience until the relevant files and workflows exist.
- Before repo-public changes, check that ignored/generated files are appropriate, no local `.env*` or `.dev.vars*` secrets are staged, and generated content is either intentionally checked in or intentionally ignored according to existing repo rules.
- Keep brand/logo rights separate from code and educational-content licensing. Current checked-in boundaries are `LICENSE`, `CONTENT_LICENSE.md`, and `BRAND.md`.
- Do not claim any license beyond what the checked-in license files actually say.
- For repo-facing preparation details, start with `docs/open-source-roadmap.md`, `docs/monetization-boundaries.md`, `docs/public-release-safety-checklist.md`, `docs/public-release-final-gate.md`, `docs/public-release-history-audit.md`, and `docs/public-release-hygiene-inventory.md`.
- `AGENTS.md` is intentional repo guidance and should remain tracked. Do not confuse it with local agent-run artifacts.
- Local agent/dev artifacts such as `.codex-tmp/`, `.codex-*.out`, `output/`, Playwright traces, screenshots, logs, crash dumps, browser profiles, and temporary QA files should remain ignored and untracked.

## Monetization And Sustainability Direction
- Core learning content, simulations, tools, guided paths, challenges, and basic practice should remain free.
- Paid access should be framed publicly as Supporter/Pro-style sustainability and convenience, not as a wall around learning.
- Paid/convenience features may include ad-free browsing, saved exact-state setups, saved compare setups, account-backed saved study tools, richer review/analytics, exports, cloud features, or future API-costly AI features.
- Do not remove Stripe, billing, entitlement, reward-discount, or ad infrastructure unless a later explicit task asks for that migration.
- Do not casually rename internal entitlement values such as `free | premium`. They affect billing, webhooks, database records, test fixtures, product gates, and stored user state. User-facing copy can move toward Supporter or Pro while internals remain `premium` until there is a safe migration plan.

## Instruction Priority
1. Explicit user task
2. This file
3. Live repo state, tests, and current routes
4. Older docs and cleanup instincts

### Current-state precedence
- Inspect before changing.
- Trust live code, tests, migrations, route behavior, and current docs over older notes.
- `README.md` is useful for quick orientation, but live code, routes, tests, and launch/account docs are the primary architecture source.
- Keep changes bounded. This repo already has strong seams for content, simulation state, accounts, billing, ads, and feedback.
- Private automation/control-plane source is intentionally not part of this curated public-release tree. Do not add it back unless the owner explicitly asks for that restoration.
- `AGENTS.md` is detailed repo guidance for future Codex/agent work. Generic tooling should not rewrite it unless the task explicitly targets `AGENTS.md`.

## Stack And Runtime
- Next.js 16 App Router
- React 19
- next-intl with locale-prefixed public routes
- TypeScript
- Tailwind CSS 4
- Zod-validated content and request schemas
- Vitest + Testing Library
- ESLint 9
- OpenNext + Wrangler for Cloudflare deployment
- Supabase Auth/Postgres for real auth + synced progress + entitlement/billing tables
- Stripe-hosted checkout / billing portal / webhooks
- Resend-backed feedback delivery when configured
- Playwright browser E2E for route/account/reward smoke coverage

## Git workflow
- When a task is complete, run the relevant checks before committing.
- Stage only files related to the task. Do not use `git add .` unless explicitly asked.
- Use Conventional Commits with a clear scope.
- Commit only after checks pass.
- Push the current branch to origin after committing.
- In the final response, report:
  - branch name
  - commit SHA
  - exact checks run

## Commit message style
- Format: type(scope): short summary
- Types: feat, fix, refactor, test, docs, chore
- Summary must describe the actual code change, not “update files”
- Mention the user-visible effect or subsystem affected

### Build-time workflow
- Core commands:
  - `pnpm dev` for local app work
  - `pnpm start` for a local production server after build
  - `pnpm test:watch` for iterative Vitest work
- `pnpm content:registry` regenerates `lib/content/generated/content-registry.ts` and `lib/i18n/generated/content-bundle.ts`.
- `pnpm i18n:translate -- --locale <locale>` runs the locale overlay translation workflow under `tools/i18n/`.
- `pnpm i18n:validate -- --locale <locale>` validates locale overlay shards and manifests.
- `pnpm i18n:worklist -- --locale <locale>` exports locale fallback worklists under `content/_meta/generated/` for manual review or translation follow-up when overlays still inherit English at runtime.
- `pnpm i18n:ping -- --provider ollama --model <local-model> --locale <locale>` is the supported health check before a real translation wave.
- `pnpm i18n:check:zh-HK` runs the shipped zh-HK locale-quality scanner over message catalogs and locale overlay files.
- `pnpm i18n:sweep:zh-HK` runs the Playwright-backed zh-HK site sweep and writes `output/browser-zhhk-site-sweep.json`.
- `pnpm content:doctor` audits content/catalog health, subject/topic wiring, and authoring integration drift.
- `pnpm launch:doctor` audits launch env/config readiness for auth, billing, ads, feedback, and Cloudflare preview/deploy parity across `.env*`, `.dev.vars`, and the private ignored `wrangler.jsonc` copied from `wrangler.example.jsonc`.
- `pnpm public-release:hygiene`, `pnpm public-release:final-check`, and `pnpm public-release:history-audit` are the canonical public-release repo checks for tracked-file hygiene, final required-path gating, and non-destructive history review.
- `pnpm github:labels:plan` is the source-of-truth helper for `.github/labels.yml`; use `-- --apply` only for an explicit GitHub label-sync task with owner approval.
- `pnpm ads:check` validates private `ads.txt` input without writing the ignored runtime file; `pnpm ads:write` materializes `public/ads.txt` when ads are actually enabled.
- `pnpm scaffold:concept` is the supported way to scaffold a new concept file set and integration checklist.
- `pnpm cf-typegen` refreshes Cloudflare env typings when bindings change.
- `pnpm test:e2e:assessment` runs the focused Playwright lane for `/tests`, concept-test entry, assessment resume, and related test-hub journeys.
- `predev`, `prebuild`, `prestart`, `pretypecheck`, `prelint`, `pretest`, `prevalidate:content`, `prepreview`, `predeploy`, and `preupload` already run `pnpm content:registry`.
- Do not hand-edit `lib/content/generated/content-registry.ts`.
- Do not hand-edit `lib/i18n/generated/content-bundle.ts`.
- `pnpm test` and `pnpm validate:content` run through `scripts/run-vitest.mjs`, not raw Vitest invocation.
- `next.config.ts` sets `typescript.ignoreBuildErrors = true`. `pnpm build` is not a substitute for `pnpm exec tsc --noEmit`.

## Repo Map
- `app/`: App Router pages and API routes. Public routes are locale-prefixed under `app/[locale]/*`, and root `/` is a locale-resolution redirect shim. Shared public route ownership still lives in the unprefixed `app/**` pages plus `app/_localized/home-page.tsx`. Important surfaces include `/`, `/about`, `/billing`, `/start`, `/search`, `/concepts`, `/concepts/[slug]`, `/concepts/topics`, `/concepts/topics/[slug]`, `/concepts/subjects`, `/concepts/subjects/[slug]`, `/tracks/[slug]`, `/tracks/[slug]/complete`, `/guided`, `/guided/[slug]`, `/challenges`, `/tests`, `/tests/concepts/[slug]`, `/tests/topics/[slug]`, `/tests/packs/[slug]`, `/tools`, `/tools/chemistry-reaction-mind-map`, `/circuit-builder`, `/assignments/[id]`, `/account`, `/account/create-password`, `/account/reset-password`, `/account/setups`, `/account/compare-setups`, `/account/study-plans`, `/dashboard`, `/dashboard/analytics`, `/pricing`, `/privacy`, `/terms`, `/ads`, `/ads.txt`, `/contact`, `/dev/account-harness`, `/auth/callback`, `/auth/confirm`, and billing/account/feedback APIs.
- `messages/` and `i18n/`: shared UI message catalogs plus locale routing, navigation, and request-resolution helpers.
- `components/concepts/`: shared concept-page surfaces, compare/prediction/challenge panels, contact form, concept browser.
- `components/challenges/`: challenge discovery hub surfaces.
- `components/guided/`: guided hub and recommended-goal-path surfaces, guided collection detail, shareable concept-bundle builder, and assignment-detail surfaces that reuse the existing concept/track/challenge routes.
- `components/tests/`: public Test Hub, standalone concept/topic/pack assessment pages, and concept-test entry affordances.
- `components/quizzes/`: shared quiz runner UI for inline concept quick tests plus standalone concept/topic/pack assessments.
- `components/tools/`: learning-tools hub surfaces plus tool-specific pages such as the chemistry reaction mind map.
- `components/circuit-builder/`: dedicated circuit-builder workspace, palette, inspector, SVG symbol, and route-level page container surfaces.
- `components/simulations/`: simulation renderer, shell, controls, graphs, time rail, and concept-specific lab components.
- `components/start/` and `components/search/`: start-here recommendation and site-search surfaces built on canonical content and progress selectors.
- `components/progress/`: continue-learning, review queue, remediation, mastery and track cues.
- `components/account/`: account panel, dashboard surfaces, achievements, saved study plans, learning analytics, premium notices, Stripe action panel, sync provider.
- `components/ads/`: shared ad slot seam and provider script seam.
- `components/share/`: stable link and exact-state share buttons/panels.
- `components/layout/`: page shell, shared header/footer, section headings, and global onboarding/feedback/analytics wrapping points.
- `components/onboarding/` + `lib/onboarding/`: route-aware onboarding/help overlay, target mapping, dispatch events, and persisted prompt/tour preferences.
- `content/catalog/`: canonical JSON catalogs for concepts, subjects, topics, starter tracks, guided collections, and recommended goal paths.
- `content/concepts/`: authored concept JSON.
- `content/i18n/`: checked-in locale overlay shards, generated locale bundles, and manifests for non-English content. Translation-memory caches are local ignored tooling state, not public runtime content.
- `lib/content/`: schemas, loaders, registry access, catalog discovery, framework helpers.
- `lib/i18n/`: locale-aware content display helpers, generated runtime bundles, and locale-specific progress copy rules layered on top of canonical English content.
- `lib/guided/`: canonical guided collection bundle and assignment resolution/validation helpers.
- `lib/test-hub/`: published concept/topic/pack test catalogs, recommendations, guided test tracks, progress summary helpers, and assessment-resume UI state.
- `lib/quiz/`: canonical quick-test definition, audit, and session-builder helpers reused by concept pages, test-hub catalogs, and topic/pack assessment assembly.
- `lib/tools/`: learning-tool registry and tool-specific data helpers that feed the hub, site navigation, and sitemap.
- `lib/assessment-sessions/`: exact local resume-session model/store for concept, topic, and pack tests.
- `lib/circuit-builder/`: circuit document model, presets, solver, graphing, educational copy, and deterministic SVG/JSON export helpers for the public circuit builder.
- `lib/learning/`: shared concept-page runtime helpers for notice prompts, challenge evaluation, and worked examples.
- `lib/physics/`: simulation math, graph series builders, types, and concept-specific models.
- `lib/progress/`: local-first progress model, merge logic, compact synced history, continue-learning, review queue, diagnostics, remediation, track/guided derivations, and premium analytics helpers.
- `lib/account/`: session/auth helpers, auth-return handling, entitlement helpers, dev harness, server-backed saved setups, compare setups, study plans, concept bundles, assignments.
- `lib/achievements/`: server-backed milestones, badge/reward state, dashboard snapshots, and event recording.
- `lib/billing/`: Stripe env, Stripe API helpers, billing summaries, billing store, webhook processing.
- `lib/ads/`: route/placement policy, render gating, and AdSense config.
- `lib/saved-setups.ts` + `lib/saved-setups-store.ts`: exact bench saved-setup model, tombstones, local cache, and account sync adapters.
- `lib/saved-compare-setups.ts` + `lib/saved-compare-setups-store.ts`: compare-scene saved library model and sync adapters.
- `lib/share-links.ts`: canonical exact-state encoding, public experiment cards, stable section links, bundle/assignment/track links.
- `lib/metadata/`: site URL, metadata builders, JSON-LD.
- `lib/trust.ts` and `lib/support.ts`: public trust/billing/support copy and support-link seams.
- `lib/feedback*`: feedback payload model, delivery, and rate limiting.
- `hooks/`: shared browser/runtime hooks used by simulation and account-aware UI.
- `scripts/`: registry generation, content doctor, concept scaffolding, and Vitest wrapper utilities.
- `docs/`: content, account, launch, and operator docs. Prefer `docs/launch-readiness.md`, `docs/prelaunch-staging-checklist.md`, `docs/platform-stability-checklist.md`, and `docs/account-sync-local-setup.md` for operator setup and route/state QA. For concept waves, scaffolding, and editorial overlay work, start with `docs/content-authoring-playbook.md`, `docs/content-wave-checklist.md`, `docs/concept-scaffolding.md`, and `docs/content-editorial-workflow.md`. Use `docs/test-hub.md` for the current public test-hub, catalog, and assessment-resume rules, `docs/quiz-authoring.md` for shared quick-test mode/template/fallback rules, `docs/concept-page-v2-authoring.md` plus `docs/concept-page-v2-migration-audit.md` for explicit concept-page V2 authoring and migration-tranche truth, `docs/adsense-manual-ads.md` for the current manual-ad placement registry and route policy, and `docs/feedback-triage.md` for feedback payload/triage semantics. Verify current auth/password and billing-return truth against `app/account/*`, `app/auth/*`, `lib/account/*`, `lib/billing/*`, `app/api/billing/reconcile/route.ts`, and current `supabase/migrations/*`. Use the content/framework docs when changing authoring shape.
- `docs/i18n.md`: source of truth for locale-prefixed route behavior, message catalogs, overlay shards, and translation-tooling workflow.
- `supabase/migrations/`: current auth-adjacent tables for synced progress snapshots, compact synced history, entitlements, billing profiles, achievements, and reward state.
- `tests/`: broad route/component/lib coverage, including billing, ads, analytics, auth, achievements, content, deployment, hooks, metadata, physics, progress, feedback, and public trust pages.
- `tests/e2e/` + `playwright.config.ts`: real browser smoke/account-achievement coverage wired through the dev harness.
- Private automation/control-plane runner files and backlog state are not part of this curated public-release tree. Local agent output remains ignored; `AGENTS.md` remains the tracked guidance file.

## Canonical Architecture Rules

### 1. Content And Route Identity
- Canonical concept identity, subject/topic membership, track composition, guided collections, and discovery surfaces come from `content/catalog/*.json` plus `content/concepts/*.json`.
- Load and validate content through `lib/content/schema.ts`, `lib/content/loaders.ts`, and `lib/content/content-registry.ts`.
- Subject, topic, start, and search surfaces should keep deriving from the same catalog and selector layer. Do not build a second discovery graph in route components.
- Do not hardcode concept, subject, topic, track, or guided-collection relationships in components.
- If you change authoring shape, update schema, loaders, tests, and docs together.

### 1A. Locale And Translation Architecture
- Locale routing and locale preference resolution live in `i18n/routing.ts` and `i18n/request.ts`.
- Public URLs are locale-prefixed such as `/en/...` and `/zh-HK/...`; root `/` is only a locale redirect shim.
- `app/[locale]/*` should stay thin wrappers over shared route implementations, and `app/[locale]/layout.tsx` owns the `NextIntlClientProvider` boundary for locale-scoped client rendering.
- Shared UI copy lives in `messages/<locale>.json`. Localized catalog overlays and lightweight concept display copy merge through `lib/i18n/content.ts` against canonical English content. Rich full-concept variant resolution lives in `lib/i18n/concept-content.ts`.
- English content in `content/catalog/*` and `content/concepts/*` remains canonical. Do not localize ids, slugs, storage keys, progress/share keys, analytics keys, or build separate locale-specific discovery graphs.

### 1B. Editorial Content Variants
- Canonical English rich content stays in `content/catalog/*` and `content/concepts/*`.
- Optional optimized English concept overlays live in `content/optimized/concepts/*`.
- Manual review/QA/provenance overrides live in `content/_meta/editorial-manifest.json`.
- Generated variant artifacts live in `content/_meta/generated/*`, `lib/content/generated/content-variants.ts`, and `lib/content/generated/content-variant-ui.ts`; do not hand-edit them.
- Runtime concept fallback order is:
  - `en`: optimized English -> canonical English
  - non-`en`: localized overlay -> optimized English -> canonical English
- Concept variant resolution lives in `lib/i18n/concept-content.ts` and `lib/content/variant-resolution.ts`. Do not add a second route-local resolver.
- `lib/i18n/content.ts` is the lightweight display/catalog helper seam. Do not move the full concept resolver back into it.
- Overlay merges are editorial-only. Do not let optimized/localized overlays rewrite ids, slugs, simulation config, formulas/tokens, URLs, or other structural fields.
- Arrays only merge when entries have stable `id` or `slug`; otherwise overlay arrays replace the canonical array wholesale.
- Localized fallback metadata and stale detection are both intentional:
  - missing localized fields may inherit optimized English at runtime
  - stale checks follow explicit `derivedFrom.variant`
  - set `derivedFrom.variant = optimized` when a locale overlay should go stale on optimized-English changes
- Concept summary/listing surfaces already use the lightweight optimized/localized UI-copy bundle. Broader subject/topic/track/guided catalogs remain on the existing locale catalog overlay system; optimized catalog overlays are out of scope unless the task explicitly expands that contract.
- When changing optimized/localized overlays or editorial metadata, rerun `pnpm content:registry`, `pnpm content:variants:status`, and `pnpm content:variants:validate`, plus `pnpm i18n:validate -- --locale <locale>` for locale overlay work.

### 2. Concept Page Assembly
- `app/concepts/[slug]/page.tsx` is the server route seam for concept pages.
- Shared composition flows through `components/concepts/ConceptPageFramework.tsx` and `components/concepts/ConceptPageSections.tsx`.
- Guided lesson flow, status cues, and legacy phase/hash compatibility now route through `components/concepts/ConceptPageV2Shell.tsx`, `components/concepts/ConceptPageStatusSurface.tsx`, `components/concepts/ConceptPagePhaseContext.tsx`, and `lib/content/concept-page-v2.ts`. Keep step progression, wrap-up/reference rails, and anchor mapping on that shared seam instead of route-local logic.
- Lower-page structure is driven by `lib/content/concept-page-framework.ts`, not per-route JSX improvisation.
- Shared learning behavior for notice prompts, challenge evaluation, and worked examples lives in `lib/learning/*`; keep those rules there instead of duplicating concept-page logic in routes or panels.
- `app/author-preview/*` reuses the same authoring/framework path and should stay aligned with public concept rendering.

### 3. One Authoritative Lab Runtime
- `components/simulations/ConceptSimulationRenderer.tsx` is the central runtime for live lab state.
- `components/simulations/SimulationShell.tsx` is the canonical dense lab layout.
- Compare mode, prediction mode, challenge mode, notice prompts, worked examples, time inspection, and share-state all hang off the same runtime state.
- Do not introduce preview-only or section-local simulation state that diverges from the main bench.

### 3A. Circuit Builder Workspace
- `app/circuit-builder/page.tsx` plus `components/circuit-builder/CircuitBuilderPage.tsx` are the public route and page-container seam for the dedicated circuit builder.
- `lib/circuit-builder/*` owns the circuit document contract, starter presets, solver, inspector graph builders, and deterministic export helpers.
- Account-backed circuit saves flow through `lib/account/circuit-saves.ts`, `app/api/account/circuit-saves/route.ts`, `lib/circuit-builder/account-saves-client.ts`, and the `CircuitBuilderPage` save panel; keep them separate from browser-local named saves and autosave recovery.
- Keep circuit-builder state and export behavior inside this seam instead of duplicating the document model in route-local helpers or forcing the builder into the concept-page simulation runtime.

### 3B. Tests And Assessment Resume
- Public test surfaces live at `/tests`, `/tests/concepts/[slug]`, `/tests/topics/[slug]`, and `/tests/packs/[slug]`.
- Published concept/topic/pack test catalogs and recommendations live in `lib/test-hub/*` and stay derived from the canonical content/discovery seams plus the shared quiz runtime. Do not invent a second assessment graph or quiz system.
- Shared quiz definition/session building lives in `lib/quiz/*`, and `components/quizzes/QuizRunnerSection.tsx` is the reusable runner UI for inline concept quick tests plus standalone concept/topic/pack assessments. Reuse those seams instead of route-local quiz flows.
- Exact in-progress assessment resume lives in `lib/assessment-sessions/*` under the browser-local storage key `open-model-lab.assessment-sessions.v1`.
- Keep assessment-session state separate from `lib/progress/*`: progress powers completion, recommendations, and sync truth, while assessment sessions power same-browser exact resume only.
- `/tests/concepts/[slug]` and `/concepts/[slug]#quick-test` are two entry points into the same concept-assessment identity. Do not fork progress or resume behavior between them.

### 3C. Challenge Discovery Hub
- Public challenge discovery lives at `/challenges`.
- `app/challenges/page.tsx`, `components/challenges/ChallengeDiscoveryHub.tsx`, `lib/content/challenge-discovery.ts`, and `lib/i18n/challenge-discovery.ts` are the canonical route, UI, index, and locale seams.
- Keep challenge entries, topic summaries, and track CTA wiring derived from canonical concept challenge authoring, starter tracks, locale display helpers, and shared progress selectors. Do not invent a second challenge catalog or route-local filter index.

### 4. Local-First Progress, Then Signed-In Sync
- `lib/progress/*` is the canonical learner-state model.
- Local progress is the default, even for signed-out use.
- The local storage key is still `physica.local-progress.v1`. That compatibility seam is intentional; do not rename it casually.
- Signed-in free and premium accounts both sync the same canonical concept snapshot into Supabase through `/api/account/progress`.
- The synced snapshot also carries bounded `history` used by internal `premium` checkpoint-history and mastery analytics. Do not fork that into a second analytics-history store.
- The paid/supporter layer, currently represented internally as `premium`, builds on the same learner-state seam for saved study tools, richer review, and dashboard analytics. It does not replace the underlying progress model.
- Continue-learning, review queue, diagnostics, remediation, track progress, guided collection progress, checkpoint history, and home/account/dashboard displays should keep reusing the same snapshot/history seams instead of inventing parallel learner models.

### 5. Achievements, Reward, And Analytics Inputs
- `lib/achievements/*` plus `/api/account/achievements` are the canonical seams for server-backed milestone stats, badge groups, reward state, and dashboard snapshots.
- Achievement events are derived from trusted concept engagement, question answers, challenge completions, track completions, and synced progress. Do not create a second achievement or analytics event model beside those seams.
- The one-time paid-tier reward, currently wired through the Premium reward flow, is account-scoped, server-backed, and intentionally bounded:
  - reward unlock state lives in the achievements store
  - checkout reservation/resume is handled through the existing billing flow
  - eligible free users can unlock one discounted first month without introducing a second plan or coupon-entry system
- `/dashboard` and `/dashboard/analytics` consume these same account/progress/achievement seams. Keep paid/supporter study analytics tied to existing progress, review, and achievement inputs.

### 6. Account Session Resolution
- Canonical session resolution lives in `lib/account/supabase.ts`.
- `/api/account/session` is the browser-facing session endpoint and the bounded POST seam for password sign-in, magic-link requests, and password-reset emails.
- `/auth/confirm` is the primary server-side auth handoff route. It accepts both exchanged auth `code` values and hashed-token verification links, sanitizes `next`, writes the auth cookies through the shared Supabase server client, routes recovery links to `/account/reset-password`, and may route first-time confirmations through `/account/create-password`.
- `/auth/callback` is a compatibility callback page. It forwards provider-style auth params to `/auth/confirm` when present, otherwise it completes the browser-session handoff through the Supabase browser client and refreshes the canonical account session.
- `/dashboard` is the signed-in landing surface. `/account` is the signed-out entry + account-management page and now exposes three bounded auth paths: returning-user password sign-in, email-link sign-in for first-time/passwordless users, and password-reset email requests.
- `/account/create-password` and `/account/reset-password` are the dedicated post-confirmation and recovery surfaces.
- Signed-out users resolve to free.
- Signed-in users without a stored entitlement row still resolve to free.
- The dev harness in `lib/account/dev-harness.ts` can override real auth locally and must remain compatible with the ordinary session seam.
- The dev harness also owns deterministic achievement and reward fixture seeding for local QA. Keep those controls aligned with the live account/billing paths instead of inventing separate test-only state models.
- Do not bolt on a second auth/session resolver alongside the existing Supabase + dev-harness path.

### 7. Entitlements And Capabilities
- `lib/account/entitlements.ts` is the source of truth for internal `free | premium` values plus capability derivation.
- Product-facing wording can move toward Supporter/Pro, but do not rename the internal `premium` tier without an explicit migration across billing, webhooks, database rows, tests, fixtures, and gated UI.
- Product gating should prefer capability checks from `ResolvedAccountEntitlement.capabilities`:
  - `shouldShowAds`
  - `canSyncProgress`
  - `canSaveCompareSetups`
  - `canShareStateLinks`
  - `canUseAdvancedStudyTools`
- Signed-in free accounts still resolve to `canSyncProgress = true`. The internal `premium` tier layers the other saved-study, share, analytics, and ad-free capabilities on top of that base account-sync behavior.
- `canSaveCompareSetups` currently gates named compare scenes, the exact saved-setup libraries, and account-backed circuit saves. Do not invent a second saved-study capability flag unless the task explicitly changes the entitlement contract.
- Do not scatter ad hoc paid-tier or premium rules across routes and components when the entitlement helper already covers the behavior.

### 8. Billing Model
- Billing state and access state are related but distinct.
- Stripe-backed billing lives in `lib/billing/*`.
- Persistent billing facts live in `public.user_billing_profiles`.
- Entitlement access lives in `public.user_entitlements`.
- Webhook dedupe lives in `public.processed_stripe_webhook_events`.
- Stripe webhooks update billing profile data and then write the bounded entitlement row through `applyStripeSubscriptionStateToUser`.
- `checkout.session.completed` links the Stripe customer to the app user, but premium access is granted or revoked by subscription events, not by optimistic client assumptions.
- `/api/billing/reconcile` is a bounded server-side checkout-return fallback. It may reconcile a completed Stripe Checkout Session for the signed-in owning user when the webhook has not landed yet, but it still applies the same billing-profile and entitlement state instead of trusting client-only success.
- The achievement reward discount integrates into this same checkout path. Eligible free users can reserve or resume one discounted Checkout Session; do not fork that into a separate promo-code or reward-billing subsystem.
- The UI may show `manual` premium when entitlement is premium without a live Stripe-managed subscription. Do not collapse that case into the Stripe state machine.
- The current billing wave is one monthly Stripe-hosted plan wired to the internal `premium` entitlement. Public copy may move toward Supporter/Pro, but do not add a second billing/access model unless the task explicitly requires it.
- Keep Stripe checkout, billing portal, webhook, reconcile, and entitlement-write behavior intact during open-source or copy-only sustainability work.

### 9. Ads Model
- Ads are allowed only through the shared ad seam: `lib/ads/slots.ts`, `lib/ads/adsense.ts`, `lib/ads/policy.ts`, `components/ads/AdSlot.tsx`, and `components/ads/AdsProviderScript.tsx`.
- Current ad-eligible route groups are:
  - `/`
  - `/search`
  - `/concepts`
  - `/concepts/topics`
  - `/concepts/topics/[slug]`
  - `/concepts/subjects`
  - `/concepts/subjects/[slug]`
  - `/guided`
  - `/concepts/[slug]` only in bounded in-article, post-lab, and footer zones outside the protected live bench
- Ads stay dormant unless `NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED=true`, a valid client id exists, the route/placement is eligible, and the matching slot id exists.
- `/ads.txt` is served from a private ignored `public/ads.txt` materialized from private AdSense seller metadata. Keep `public/ads.example.txt` as the placeholder-only format reference, use `pnpm ads:write` when ads are enabled, and do not reintroduce a dynamic App Router handler or a duplicate repo-root source.
- The paid/supporter entitlement is ad-free through the same entitlement capability model; internals currently express that as `premium`.
- Do not put ads into the simulation stage, primary control column, graph panels, compare/prediction/challenge interactive regions, `/about`, pricing, account, auth, billing, contact, trust pages, guided collection detail pages, or dev harness pages.
- Prefer manual placement through the shared slot map. Do not introduce a separate ad-placement system or sprinkle provider code across arbitrary pages.

### 10. Share And Saved Study Tools
- `lib/share-links.ts` is canonical for:
  - stable concept/section links
  - exact-state concept links via `state`
  - public experiment cards via `experiment`
  - guided collection bundles via `bundle`
  - assignment, track recap, and completion links
- Guided collection bundle and assignment normalization lives in `lib/guided/concept-bundles.ts` and `lib/guided/assignments.ts`. Reuse those helpers from account APIs, progress selectors, and share-link surfaces instead of duplicating collection-step validation or stable-link shaping.
- Free users keep stable concept/section links.
- Internal `premium` capability gating currently covers exact-state sharing and richer share surfaces through `canShareStateLinks`.
- Exact saved setups are local-first and flow through:
  - `lib/saved-setups.ts`
  - `lib/saved-setups-store.ts`
  - `/api/account/saved-setups`
  - `/account/setups`
  - `components/share/ConceptShareLinksPanel.tsx`
- Saved compare setups are gated by internal `premium` capabilities and flow through:
  - `lib/saved-compare-setups.ts`
  - `lib/saved-compare-setups-store.ts`
  - `components/concepts/SavedCompareSetupsCard.tsx`
  - `/api/account/compare-setups`
  - `/account/compare-setups`
- Saved compare-setup recovery for review/remediation flows lives in:
  - `lib/account/compare-setup-recovery.ts`
  - `/api/account/compare-setups/recovery`
  - `components/progress/AccountAwareReviewRemediationList.tsx`
  - `lib/progress/remediation.ts`
- Reopen saved compare benches through the shared `state` + `experiment` share-link seam instead of inventing a separate recovery URL format.
- Saved study plans are gated by internal `premium` capabilities and flow through:
  - `lib/account/study-plans.ts`
  - `/api/account/study-plans`
  - `/account/study-plans`
  - `components/account/SavedStudyPlansPage.tsx`
- Guided collection concept bundles are sign-in-gated and flow through:
  - `lib/account/concept-bundles.ts`
  - `/api/account/concept-bundles`
  - `components/guided/ConceptBundleBuilder.tsx`
  - `lib/guided/concept-bundles.ts`
- Guided collection assignments are sign-in-gated and flow through:
  - `lib/account/assignments.ts`
  - `/api/account/assignments`
  - `/assignments/[id]`
  - `components/guided/AssignmentDetailPage.tsx`
  - `/dashboard`
  - `lib/guided/assignments.ts`
- Do not invent new query params, duplicate encoded state formats, or alternate share-link stores.

### 11. Server-backed Saved Objects
- `lib/account/server-store.ts` is the current bounded server-side store for:
  - saved exact setups
  - saved compare setups
  - saved study plans
  - account-backed circuit saves
  - guided collection concept bundles
  - guided collection assignments
- It is file-backed JSON, not a general backend abstraction.
- Saved exact setups, saved compare setups, and saved study plans are gated by internal `premium` capabilities. Guided concept bundles and assignments are sign-in-gated but not premium-only.
- Extend this seam carefully instead of adding a parallel store for closely related saved-study features.

### 12. Feedback, Contact, And Analytics
- Feedback/contact submission flows through `app/api/feedback/route.ts`.
- Delivery config and Resend handoff live in `lib/feedback-delivery.ts`.
- The UI always keeps the mailto fallback visible through `components/feedback/FeedbackCaptureForm.tsx` and `components/feedback/FeedbackWidget.tsx`.
- Rate limiting is in `lib/feedback-rate-limit.ts`.
- Analytics is a separate optional webhook relay in `app/api/analytics/route.ts` and `lib/analytics.ts`.
- `components/layout/PageShell.tsx` centrally adds page-view analytics, route-aware onboarding/help, footer/header chrome, and the floating feedback widget on most pages. Reuse that shell instead of recreating those behaviors route by route.
- If route-visible layout work changes or removes `data-onboarding-target` anchors, update `components/onboarding/OnboardingExperience.tsx` and `lib/onboarding/help-content.ts` together so contextual help stays truthful.
- Do not claim a support backend, moderation queue, or admin dashboard that does not exist.

### 13. Metadata, Canonical URLs, And Public Trust
- `lib/metadata/site.ts` is the canonical site URL seam. Prefer `NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL` / `OPEN_MODEL_LAB_SITE_URL`.
- Trust/legal/public disclosure pages already exist at `/privacy`, `/terms`, `/ads`, `/billing`, and `/contact`.
- Discovery/SEO surfaces also include `robots.txt`, `sitemap.xml`, `ads.txt`, JSON-LD builders, and shared metadata helpers.
- Keep trust pages and launch docs truthful to the current implementation. Do not turn them into aspirational fiction.

## Product And UX Rules To Preserve
- Keep concept pages dense and lab-first. The stage, graph, and core controls should remain visible together.
- Reuse `SimulationShell` and the current page rhythm instead of inventing page-specific layouts.
- Keep ads off the core interactive learning bench.
- Keep Supporter/Pro/Premium messaging honest:
  - core learning content, simulations, guided paths, challenges, tools, and basic practice remain free
  - signing in is optional
  - signing in alone does not grant paid/supporter access
  - the paid layer is a bounded sustainability and convenience layer on top of the free core product
  - internal entitlement values may still say `premium` even when user-facing copy says Supporter or Pro
- Keep dashboard/account achievement and reward states honest. Locked, unlocked, claimed, expired, already-used, and premium-active states are all real product states.
- Keep trust-copy and fallback states honest. If delivery/billing/ads are unconfigured, the UI should say so plainly.
- Extend the current design language instead of broad redesigns unless the task explicitly asks for one.

## Safe Implementation Guidance
- Inspect the current seam before editing. Show you understand the relevant source-of-truth file first.
- Extend existing helpers before creating new ones:
  - entitlement checks -> `lib/account/entitlements.ts`
  - session/auth -> `lib/account/supabase.ts` and dev harness helpers
  - billing -> `lib/billing/*`
  - ads -> `lib/ads/*` + `components/ads/*`
  - locale routing and translation -> `i18n/*`, `messages/*`, `content/i18n/*`, and `lib/i18n/*`
  - learning tools -> `lib/tools/*` and `components/tools/*`
  - circuit builder -> `lib/circuit-builder/*` and `components/circuit-builder/*`
  - share state -> `lib/share-links.ts`
  - saved study tools -> `lib/saved-setups*`, `lib/saved-compare-setups*`, `lib/account/study-plans.ts`, and account store routes
  - feedback -> `lib/feedback*`
  - content/catalog -> `lib/content/*`
  - progress/review/remediation -> `lib/progress/*`
  - achievements/reward -> `lib/achievements/*`
- Do not introduce:
  - a second entitlement/capability system
  - a second billing/access model
  - a second ad placement/provider seam
  - route-local exact-state encoding
  - a separate synced learner model
  - duplicate provider logic when the current seam already handles the vendor
- Preserve compatibility for slugs, IDs, storage keys, query params, and saved payload formats unless the task explicitly includes migration work.

## Codex Working Rules
- Inspect first, then change. For any non-trivial task, identify the existing seam and the current source-of-truth file before patching.
- Contract first before large edits. If the change spans routes, schemas, saved payloads, or account capabilities, pin down the canonical ownership boundary before implementation.
- Keep implementation slices isolated. If work is split across agents, give each agent a non-overlapping write set.
- Do not have multiple parallel agents edit the same route, shared component, schema, content loader, progress helper, account helper, billing helper, ad seam, or share-link file at the same time.
- Use one owner for integration on shared surfaces. Merge behavior, compatibility, and final cleanup should have a single editor.
- Finish with a verification and hardening pass. Validate the actual user-visible route or surface you changed, not just the helper underneath it.
- Preserve compatibility for public URLs, storage keys, query params, payload shapes, and saved objects unless the task explicitly includes migration work.

## Open-Source Task Checklist
- Inspect live repo state first, including `README.md`, `package.json`, `.gitignore`, relevant docs, and the source-of-truth code seams for the requested change.
- Classify the requested open-source work before editing: copy/docs-only, entitlement logic, billing logic, licensing, public-release safety, generated-file hygiene, or secret/config cleanup.
- Keep changes bounded to that class. Do not mix public-release docs with product-code behavior changes, billing migrations, entitlement renames, or broad cleanup unless explicitly requested.
- For licensing tasks, verify which license files actually exist before making claims. Keep code, educational content, and brand/trademark terms separate when adding future license docs.
- For public-release safety tasks, search for secrets and private identifiers before staging, confirm `.env*` and `.dev.vars*` remain ignored except approved example files, and keep example env values placeholder-only.
- Run targeted checks for the touched surface, plus term searches for sensitive words when editing AGENTS, README, launch docs, env examples, or license/contribution docs.
- Report exactly what changed, what checks ran, and what was intentionally left unchanged, especially when internal `premium` wording remains for compatibility.

## Local Development Notes
- For deterministic signed-out / signed-in free / signed-in premium QA, prefer `/dev/account-harness`.
- Enable the harness with `ENABLE_DEV_ACCOUNT_HARNESS=true`.
- The harness is dev-only, cookie-based, and intentionally disabled in production.
- The harness also exposes achievement/reward reset and seeding controls for `/account`, `/account/study-plans`, `/dashboard`, `/dashboard/analytics`, and checkout-gating QA.
- Use `Reset to real auth` when you want ordinary Supabase testing again.
- Browser E2E is now first-class:
  - `pnpm test:e2e:install`
  - `pnpm test:e2e`
  - `pnpm test:e2e:headed`
- Use `pnpm exec playwright show-report output/playwright/report` when you need the saved HTML report after an E2E run.
- `playwright.concept-v2.config.ts` is the focused production-style concept-page lane: `pnpm test:e2e:concept-v2` boots `pnpm build && pnpm exec next start` and writes its HTML report to `output/playwright/concept-v2-report`.
- `playwright.config.ts` starts a local dev server, enables the harness, points `OPEN_MODEL_LAB_ACCOUNT_STORE_PATH` at an isolated ignored `output/playwright` file, and uses the harness API for deterministic account/reward coverage. Keep that setup aligned with the real account and billing seams.
- For real Supabase auth testing, start with `docs/account-sync-local-setup.md` and `docs/prelaunch-staging-checklist.md`, then verify current `app/account/*`, `app/auth/*`, `lib/account/*`, `supabase/migrations/*`, and billing tables if the task touches password flows, callbacks, synced history, Premium gating, or Stripe state. Those docs are helpful, but live code and migrations remain the source of truth.
- Use it for:
  - env vars
  - redirect URLs
  - auth template expectations
  - manual entitlement-row testing

## Deployment And Manual Ops Notes
- Cloudflare deployment is wired through OpenNext + Wrangler.
- Important deployment/config seams:
  - `next.config.ts`
  - `open-next.config.ts`
  - `wrangler.example.jsonc`
  - private ignored `wrangler.jsonc`
  - `lib/deployment/cloudflare-assets.ts`
  - `lib/metadata/site.ts`
  - `docs/launch-readiness.md`
- `next.config.ts` intentionally pins `turbopack.root` and `outputFileTracingRoot` to the repo root and initializes OpenNext Cloudflare for local dev. Treat edits there as deployment-critical; do not relax that root pin casually.
- Cloudflare skew protection is already wired through `lib/deployment/cloudflare-assets.ts` and `open-next.config.ts`. Do not hand-roll a parallel asset-versioning or cache-busting system.
- `wrangler.example.jsonc` intentionally keeps runtime vars dashboard-managed with `keep_vars: true`. Copy it to the private ignored `wrangler.jsonc` for real preview/deploy work; do not commit the private config or move launch-critical secrets into committed `vars`.
- For Cloudflare preview/deploy parity, mirror required runtime secrets into `.dev.vars`, and mirror any `NEXT_PUBLIC_*` values needed at build time into Cloudflare build variables as well as runtime settings.
- `pnpm launch:doctor` now specifically warns on missing `.dev.vars` secret mirrors, canonical site-URL drift between Next env and `wrangler.jsonc`, and `ENABLE_DEV_ACCOUNT_HARNESS` leaking into preview-style config. Treat those as real parity problems, not cosmetic warnings.
- There is currently no root-level `middleware.ts` or Next.js `proxy.ts` entrypoint in this repo. `lib/supabase/proxy.ts` is a helper, not a global request-interception seam. Do not introduce a new root-level interceptor casually. Treat any such change as deployment-critical and verify Cloudflare/OpenNext behavior explicitly if a task truly requires it.
- The repo supports these in code, but vendor/dashboard setup is still manual:
  - Supabase project, redirect URLs, and service-role envs
  - Stripe secret key, price ID, Billing Portal enablement, webhook endpoint/subscriptions
  - AdSense client/slot IDs, private `ads.txt` materialization, account approval, and any required consent tooling
  - Resend API key and verified sending domain
- Keep the distinction clear between code-supported behavior and manual launch ops.

## Validation And Workflow
- Required repo-wide validations for this codebase:
  - `pnpm lint`
  - `pnpm exec tsc --noEmit`
  - `pnpm test`
  - `pnpm build`
- Useful additional validation:
  - `pnpm validate:content`
  - `pnpm test tests/content/quiz-audit.test.ts` when changing quick-test authoring, generated quiz templates, or shared quiz-session behavior
  - `pnpm i18n:validate -- --locale <locale>` when changing locale overlays or translation tooling
  - `pnpm i18n:check:zh-HK` when auditing shipped zh-HK locale quality beyond structural overlay validation
  - `pnpm i18n:sweep:zh-HK` when route-visible zh-HK regressions need a Playwright-backed site sweep
  - `pnpm content:doctor`
  - `pnpm launch:doctor`
  - `pnpm content:registry`
  - `pnpm preview` for Cloudflare/OpenNext-sensitive changes when the environment is available
  - `pnpm cf-typegen` when Cloudflare bindings/env typings change
  - `pnpm test:e2e:assessment` when changing `/tests`, concept-test entry surfaces, assessment resume, or test-hub recommendations
  - `pnpm test:e2e:concept-v2` when changing guided concept-page lesson flow, status surface behavior, or concept-page step/anchor wiring
- Browser validation:
  - `pnpm test:e2e` for the Playwright smoke/account-achievement lane
  - `pnpm test:e2e:headed` when you need local interactive debugging
- For UI/account/billing/ads/feedback changes, prefer real browser verification in addition to unit tests.
- For route-visible product changes, verify real surfaces, not just helpers.
- Keep the repo green. If a failure is pre-existing and unrelated, say so clearly instead of drifting into unrelated maintenance.

## High-Leverage Caution Areas
- `content/catalog/*.json`
- `content/concepts/*.json`
- `content/i18n/*`
- `messages/*.json`
- `i18n/*`
- `lib/content/schema.ts`
- `lib/content/loaders.ts`
- `lib/content/generated/content-registry.ts`
- `lib/i18n/*`
- `lib/guided/*`
- `lib/learning/*`
- `components/concepts/ConceptPageFramework.tsx`
- `components/concepts/ConceptPageV2Shell.tsx`
- `components/concepts/ConceptPageStatusSurface.tsx`
- `components/concepts/ConceptPagePhaseContext.tsx`
- `components/circuit-builder/CircuitBuilderPage.tsx`
- `components/quizzes/QuizRunnerSection.tsx`
- `components/tools/*`
- `lib/content/concept-page-v2.ts`
- `components/tests/*`
- `lib/quiz/*`
- `components/simulations/ConceptSimulationRenderer.tsx`
- `components/simulations/SimulationShell.tsx`
- `lib/circuit-builder/*`
- `lib/test-hub/*`
- `lib/assessment-sessions/*`
- `lib/tools/*`
- `lib/progress/*`
- `lib/progress/history.ts`
- `lib/achievements/*`
- `lib/account/entitlements.ts`
- `lib/account/circuit-saves.ts`
- `lib/account/supabase.ts`
- `lib/account/dev-harness.ts`
- `lib/account/server-store.ts`
- `lib/account/study-plans.ts`
- `lib/saved-setups*`
- `lib/saved-compare-setups*`
- `lib/billing/*`
- `lib/ads/*`
- `lib/ads/policy.ts`
- `lib/share-links.ts`
- `lib/metadata/site.ts`
- `lib/deployment/cloudflare-assets.ts`
- `scripts/content-doctor.mjs`
- `scripts/generate-i18n-content-bundle.mjs`
- `components/layout/PageShell.tsx`
- `app/layout.tsx`
- `app/[locale]/layout.tsx`
- `app/circuit-builder/page.tsx`
- `app/api/account/progress/route.ts`
- `app/api/account/session/route.ts`
- `app/api/account/circuit-saves/route.ts`
- `app/api/account/password/route.ts`
- `app/api/account/achievements/route.ts`
- `app/api/account/saved-setups/route.ts`
- `app/api/account/study-plans/route.ts`
- `app/api/billing/checkout/route.ts`
- `app/api/billing/reconcile/route.ts`
- `app/auth/confirm/route.ts`
- `app/auth/callback/page.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/manifest.ts`
- `public/ads.example.txt`
- `scripts/write-ads-txt.mjs`
- `app/dashboard/analytics/page.tsx`
- `playwright.config.ts`
- `playwright.concept-v2.config.ts`
- `app/api/feedback/route.ts`
- `docs/launch-readiness.md`
- `docs/test-hub.md`

## Completion Rules
- Be concrete about files touched, commands run, and verification completed.
- Report blockers and partial verification plainly.
- If another doc is stale, say so directly instead of silently treating it as truth.
- Do not call a task complete just because tests passed on unrelated code.
