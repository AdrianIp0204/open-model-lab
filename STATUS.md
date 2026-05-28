# Open Model Lab Status

## 2026-05-28 Concept Pages Full QA / UI-UX Pass

Current state: the concept-page QA pass is complete and follow-up work is now captured as `OML-QA-015` through `OML-QA-024` in `TASKS.md`. No product code was changed in this pass.

### Scope Checked

- Representative concepts: SHM, UCM, projectile motion, electric fields, unit circle, acid/base pH, matrix transformations, binary search, reaction rate, derivative slope, conservation of momentum, and wave interference.
- Viewports: `1440x900`, `820x1180`, `390x844`, and `360x740`.
- Features probed: Help / Tutorial, guided step navigation, inline quick checks, prediction prompt, guided overlays, equation map, wrap-up/challenge links, visible support tools, touch targets, density, overflow, and protected learning-zone overlays.

### Main Findings

- No route crashes or page-level horizontal overflow were found in the representative sweep.
- The current guided task is too far below the first usable bench viewport after the old first-action rail removal.
- Mobile controls are still too tall and bury the graph, prediction, overlay, equation-map, and guided-task surfaces.
- Inline guided quick checks look answerable but are static, while the separate prediction prompt repeats similar content interactively.
- Compare mode is still not discoverable in the guided concept-page flow.
- Prediction, overlay, and equation-map tools are several screens below the live bench.
- First-viewport text/card density remains high across nearly all representative concept pages.
- Some mobile simulation visuals/readouts are too small to inspect comfortably.
- Floating Coach/Feedback controls can overlap concept bench content.
- Post-bench support sections need consolidation.
- A few concept-page touch targets remain below the 44px floor.

### Artifacts

- Sweep summary: `output/concept-qa-pass-2026-05-28/2026-05-28T15-17-02-393Z/summary.json`
- Full sweep report: `output/concept-qa-pass-2026-05-28/2026-05-28T15-17-02-393Z/report.json`
- Screenshots: `output/concept-qa-pass-2026-05-28/2026-05-28T15-17-02-393Z/screenshots/`
- Feature screenshots: `output/concept-qa-pass-2026-05-28/manual-feature-shots/`

### Validation Run

- Custom Playwright/browser QA sweep over 48 route/viewport combinations: passed with `errors: 0`; produced findings for density and target-size work.
- Manual feature probes over SHM, UCM, and Acid/Base on desktop and phone: Help, step navigation, prediction prompt, overlays, equation map, and challenge deep links were exercised; findings captured in `TASKS.md`.

## 2026-05-28 OML-QA-014 Concept Bench First-Action Rail Removal

Current state: `OML-QA-014` is complete. Guided concept pages no longer render the visible `Try this first` / first-action card under the live model. The current action remains in the guided step rail, and the Help / Tutorial concept-page copy now carries the predict-change-observe-explain-check loop.

### Files Changed

- `components/simulations/ConceptSimulationRenderer.tsx`: removed the guided first-action rail from guided concept benches and stopped rendering the empty interaction rail for active phase pages.
- `app/globals.css`: removed styling that only applied to the deleted first-action task card.
- `messages/en.json`, `messages/zh-HK.json`: renamed visible "Try this first" concept-page labels and added the first-move loop to concept Help / Tutorial copy.
- Tests: updated focused concept V2, layout, component, and i18n expectations.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/simulations/ConceptSimulationRenderer.tsx tests/e2e/concept-page-v2-flow.spec.ts tests/e2e/concept-layout.spec.ts tests/e2e/concept-explore-first-load.spec.ts tests/components/concept-page-v2-panels.test.tsx`: passed.
- `pnpm exec vitest run tests/components/concept-page-v2-panels.test.tsx tests/i18n/onboarding-help-zh-hk-copy.test.ts`: passed, 26/26.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/concept-page-v2-flow.spec.ts --project=chromium`: passed, 16/16.
- `pnpm exec playwright test tests/e2e/concept-layout.spec.ts -g "keeps the guided live lab|Projectile Motion interaction-first|opens Uniform Circular Motion" --project=chromium`: passed, 3/3.
- Additional probe: full `tests/e2e/concept-layout.spec.ts` ran 31/32 passing; the remaining failure is an unrelated existing Circuit Builder visual selector issue where the locator resolves a hidden circuit visual. `tests/e2e/concept-explore-first-load.spec.ts` is stale against current V2 pages and fails before this change while waiting for removed `concept-hero-intro`.

## 2026-05-28 Cloudflare Deploy Size Fix

Current state: deploy config is repaired. The first post-QA Cloudflare deploy attempt built successfully but failed upload validation because Wrangler scanned the repo root for additional modules and pushed duplicate content plus unrelated files over the 10 MiB Worker limit.

### Files Changed

- `wrangler.example.jsonc`: scopes `base_dir` to `.open-next/server-functions/default` for OpenNext additional-module discovery.
- `scripts/write-wrangler-config.mjs`: validates that deploy configs do not use the repository root as `base_dir` when `find_additional_modules` is enabled.

### Validation Run

- `git diff --check`: passed.
- `node --check scripts/write-wrangler-config.mjs`: passed.
- `pnpm wrangler:check`: passed against private `wrangler.jsonc`.
- `pnpm exec wrangler deploy --dry-run --outdir tmp/wrangler-dry-fixed --metafile tmp/wrangler-dry-fixed/meta.json`: passed; dry-run upload size dropped to `37935.85 KiB / gzip: 7035.11 KiB`.

## 2026-05-28 OML-QA-013 Signed-In Account Plan Link Repair

Current state: `OML-QA-013` is complete. Signed-in account links now keep the compact visual header label while exposing an accessible link name that includes both the account display name and current plan tier for the free and supporter smoke flows.

### Files Changed

- `components/layout/SiteHeader.tsx`: added signed-in account link `aria-label` text that combines the account display name with the localized account status label for desktop and mobile header links.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for the worker patch.
- `pnpm exec playwright test tests/e2e/site-smoke.spec.ts`: passed, 6/6.
- `pnpm typecheck`: passed.
- `pnpm test:e2e:qa-sweep --allow-test-failures`: passed with `ok: true`, `hasInstability: false`, and `hasTestFailures: false`. Summary: `output/playwright/qa-sweep/2026-05-28T14-01-50-496Z/summary.json`.

## 2026-05-28 OML-QA-012 Search Mobile CTA Placement

Current state: `OML-QA-012` is complete. The `/search` saved-progress primary CTA now appears before the mobile filter and guide stack so the public discovery layout audit keeps a clear next step inside the first 390x844 viewport while preserving the desktop filter-first order.

### Files Changed

- `components/search/SearchPage.tsx`: reordered the search controls stack with responsive ordering so the saved-progress CTA moves up on mobile and stays after filters/guide/scope on `md+`.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/search/SearchPage.tsx`: passed.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"`: passed, including `/start` first-time, `/start` saved-progress, and `/search` mobile coverage.

## 2026-05-28 OML-QA-011 Local Playwright QA Sweep Stabilization

Current state: `OML-QA-011` is complete. Broad local Playwright QA sweeps now have a shardable runner that launches one spec shard per port, separates artifacts per shard, and scans logs for the dev-server restart and connection-reset signatures that caused the original broad-sweep instability.

### Files Changed

- `playwright.config.ts`: added `PLAYWRIGHT_PORT`, `PLAYWRIGHT_BASE_URL`, `OPEN_MODEL_LAB_PLAYWRIGHT_SERVER`, and artifact-suffix support so local shards can use isolated ports and output folders.
- `scripts/run-playwright-qa-sweep.mjs`: added the shard runner and instability scanner for the broad QA spec set.
- `package.json`: added `pnpm test:e2e:qa-sweep`.
- `TASKS.md`: marked `OML-QA-011` complete and added `OML-QA-013` for the separate signed-in account link smoke failure found during QA.
- Tracking: `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `node --check scripts/run-playwright-qa-sweep.mjs`: passed.
- `pnpm exec eslint playwright.config.ts scripts/run-playwright-qa-sweep.mjs`: passed.
- `pnpm typecheck`: passed.
- `pnpm test:e2e:qa-sweep --allow-test-failures`: passed as an infrastructure gate. Summary `output/playwright/qa-sweep/2026-05-28T12-40-33-301Z/summary.json` reported `hasInstability: false`; every shard had no `ERR_EMPTY_RESPONSE`, `ERR_INCOMPLETE_CHUNKED_ENCODING`, `ERR_CONNECTION_REFUSED`, or dev-server memory-restart matches. The remaining test failures are now tracked separately as `OML-QA-012` and `OML-QA-013`.

## 2026-05-28 OML-QA-010 Mobile Dark-Pill Contrast Audit Stabilization

Current state: `OML-QA-010` is complete. The mobile dark-pill contrast audit now visits each "other audited" route in a fresh mobile browser context and waits for a route-specific stable marker before checking the shared on-dark foreground contract.

### Files Changed

- `tests/e2e/mobile-cta-contrast.spec.ts`: added route-ready markers, isolated per-route mobile contexts, explicit context cleanup on setup failure, and a longer bounded timeout for the audited route loop.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint tests/e2e/mobile-cta-contrast.spec.ts`: passed.
- `pnpm exec playwright test tests/e2e/mobile-cta-contrast.spec.ts -g "other audited"`: passed three consecutive isolated runs.
- `pnpm typecheck`: passed.
- Focused subset command from the QA pass: mobile contrast tests passed inside the subset. The subset still failed on already-tracked `OML-QA-012` (`/search` mobile CTA below the fold at `1173px`) and `OML-QA-011` dev-server restart instability (`ERR_EMPTY_RESPONSE`, `ERR_INCOMPLETE_CHUNKED_ENCODING`, `ERR_CONNECTION_REFUSED`, and account-flow fallout after restart).

## 2026-05-28 OML-QA-009 Public Discovery Start Progress Test Repair

Current state: `OML-QA-009` is complete. The public discovery layout test now intentionally covers both `/start` first-time and saved-progress headings instead of seeding progress and expecting first-time copy.

### Files Changed

- `tests/e2e/public-discovery-layout.spec.ts`: added named `/start` no-progress and saved-progress cases, made local-progress seeding opt-in per route case, and refreshed stale route heading expectations.
- `TASKS.md`: marked `OML-QA-009` complete and added `OML-QA-012` for the separate `/search` mobile CTA placement issue found during QA.
- Tracking: `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint tests/e2e/public-discovery-layout.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"`: `/start` first-time and saved-progress cases passed; the run failed afterward on `site search with saved progress (/search) @ mobile-390x844` because `search-primary-cta` starts at `1173px`, below the `844px` viewport. That separate issue is now tracked as `OML-QA-012`.

## 2026-05-28 OML-QA-008 Header Brand Truncation Repair

Current state: `OML-QA-008` is complete. The desktop header now keeps the full `Open Model Lab` brand readable at common desktop widths without pushing the primary nav, help, theme, start, or account controls off-screen.

### Files Changed

- `components/layout/SiteHeader.tsx`: made the brand column flex-safe at desktop widths, hid the route subtitle until wider viewports, and compacted secondary header labels/badges where space is tight.
- `components/layout/ThemeModeToggle.tsx`: added an optional label class hook so the desktop header can keep the icon visible while hiding the text label at tighter widths.
- `tests/e2e/header-footer-shell.spec.ts`: added a 1280px/1440px desktop regression over home, SHM, the chemistry tool, and Circuit Builder.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec playwright test tests/e2e/header-footer-shell.spec.ts --project=chromium`: passed, 2/2 tests.
- Screenshot inspection for `/`, `/concepts/simple-harmonic-motion`, `/tools/chemistry-reaction-mind-map`, and `/circuit-builder` at 1280x900 and 1440x900: passed; all headers showed full `Open Model Lab` brand text and visible controls without overlap.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.

## 2026-05-28 OML-QA-007 Mobile Feedback Widget Occlusion Repair

Current state: `OML-QA-007` is complete. The feedback trigger no longer floats over the first mobile viewport on the audited learning and pricing surfaces, and Circuit Builder hides the widget so it does not compete with workbench controls.

### Files Changed

- `components/feedback/FeedbackWidget.tsx`: changed the mobile trigger to a compact in-flow 44px icon button while preserving the accessible feedback name; desktop keeps the fixed floating widget.
- `components/layout/PageShell.tsx`: removed the old mobile bottom-padding reservation because the widget no longer overlays mobile content.
- `app/circuit-builder/CircuitBuilderRoute.tsx`: disabled the feedback widget on the workbench route.
- Tests: updated `tests/components/feedback-widget.test.tsx`, `tests/components/page-shell.test.tsx`, and `tests/app/circuit-builder-page.test.tsx`.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check 3bcedc2..HEAD`: passed for the worker patch.
- `pnpm exec vitest run tests/components/feedback-widget.test.tsx tests/app/circuit-builder-page.test.tsx tests/components/page-shell.test.tsx`: passed, 8/8 tests.
- Mobile Playwright screenshot/overlap validation at 390x844 for `/`, `/concepts`, `/pricing`, `/tests`, and `/circuit-builder`: passed with `failureCount: 0`; screenshots and summary are under `output/qa-oml-qa-007-2026-05-28/orchestrator-qa/`.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.

## 2026-05-28 OML-QA-006 Mobile Simulation Tap Target Repair

Current state: `OML-QA-006` is complete. Mobile concept simulation controls now meet the 44px target floor across the representative concept bench surfaces, and the SHM, electric-field, unit-circle, and projectile SVG drag handles keep larger invisible hit areas without enlarging the visible handles.

### Files Changed

- Shared concept/control surfaces: raised mobile tap target floors in concept mode tabs, disclosures, graph tabs, prediction/challenge/notice panels, quiz restart/details controls, share/setup links, progress actions, and premium notice actions.
- Simulation controls: raised touch targets in `ControlPanel`, `TimeControlRail`, and `ConceptSimulationRenderer` support controls.
- SVG drag handles: enlarged invisible hit areas in `SHMSimulation`, `ElectricFieldsSimulation`, `UnitCircleRotationSimulation`, and `ProjectileSimulation`; SHM now handles captured pointer move/up/cancel/lost-capture events on the mass target.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- Mobile target/drag audit over `/concepts/simple-harmonic-motion`, `/concepts/electric-fields`, `/concepts/unit-circle-sine-cosine-from-rotation`, and `/concepts/projectile-motion`: passed with `failedTargetCount: 0` and `failedDragCount: 0`.
- Screenshot inspection: passed for the four mobile audit screenshots under `output/qa-oml-qa-006-2026-05-28/orchestrator-qa-after-repair/`.
- `pnpm typecheck`: passed.

## 2026-05-28 OML-QA-005 Chemistry Mind Map Mobile Overflow Repair

Current state: `OML-QA-005` is complete. The Chemistry Reaction Mind Map mobile layout no longer creates page-level horizontal overflow, and the graph status chips, route controls, and zoom controls remain readable and usable at 390px width.

### Files Changed

- `components/tools/chemistry/ChemistryReactionMindMapPage.tsx`: constrained the mobile work surface, stacked the graph header on narrow screens, and raised route select/search controls to usable touch height.
- `components/tools/chemistry/ChemistryReactionGraph.tsx`: wrapped mobile toolbar status chips, let the camera status fit without truncation on mobile, and raised zoom slider/button touch targets.
- `tests/e2e/chemistry-reaction-mind-map.spec.ts`: added a mobile overflow/control-usability regression for the chemistry mind map.
- `lib/content/generated/content-registry.ts`: refreshed generated content metadata from the validation pretypecheck hook.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts -g "avoids mobile horizontal overflow"`: passed.
- `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts`: passed, 4/4 tests.
- Screenshot/metrics inspection for `output/qa-oml-qa-005-2026-05-28/orchestrator-screenshots/mobile-chemistry-reaction-mind-map.png`: passed; metrics reported `horizontalOverflow: 0` and fitted graph/status chips.
- `pnpm typecheck`: passed.

## 2026-05-28 OML-QA-004 Concept Bench Active Task Copy Repair

Current state: `OML-QA-004` is complete. The guided first-action active task title and instruction copy now wrap instead of clipping on the checked SHM and projectile concept pages.

### Files Changed

- `components/simulations/ConceptSimulationRenderer.tsx`: removed the line clamps from the guided first-action active task goal and instruction body.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- Playwright screenshot/DOM validation for `/concepts/simple-harmonic-motion` and `/concepts/projectile-motion` at 1440x1000 and 390x844: passed.
- Screenshot inspection found no visible active-task title/body clipping or ellipsis.
- `pnpm typecheck`: passed.
- QA artifacts: `output/qa-oml-qa-004-2026-05-28/`.

## 2026-05-28 OML-QA-003 Circuit Builder Fold Repair

Current state: `OML-QA-003` is complete. The Circuit Builder workbench now starts above the fold on the 1440x900 desktop layout, and the mobile first viewport shows a readable workspace/canvas instead of pushing the circuit/readout below the initial view.

### Files Changed

- `components/circuit-builder/CircuitBuilderPage.tsx`: compacted the hero/preset band, tightened builder spacing, and moved the mobile palette/inspector panels ahead of saved-circuit panels.
- `components/circuit-builder/CircuitWorkspace.tsx`: added a compact mobile SVG canvas frame, tightened workspace controls, shortened the mobile canvas height, and kept empty-workspace text legible.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "keeps the builder row visible"`: passed.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts`: passed, 18/18 tests.
- `pnpm typecheck`: passed.
- Screenshots captured and inspected: `output/qa-oml-qa-003-2026-05-28/orchestrator-screenshots/desktop-circuit-builder.png` and `output/qa-oml-qa-003-2026-05-28/orchestrator-screenshots/mobile-circuit-builder.png`.

## 2026-05-28 OML-QA-002 Chemistry Mind Map Node Overflow

Current state: `OML-QA-002` is complete. The desktop chemistry reaction mind map keeps the `Carboxylate salt` label inside its node at the default 1440px viewport while preserving the map-first layout.

### Files Changed

- `components/tools/chemistry/ChemistryReactionGraph.tsx`: increased the shared node height from 124px to 152px.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check 07452fd^..07452fd`: passed for the worker patch.
- `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts -g "map-first on initial desktop"`: passed.
- `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts`: passed, 3/3 tests.
- `pnpm typecheck`: passed.

## 2026-05-28 OML-QA-001 Semantic Heading Repair

Current state: `OML-QA-001` is complete. The affected public, account, dashboard, billing, trust/info, and localized concept routes now expose their hero `SectionHeading` as the page `h1`.

### Files Changed

- Route heading updates: `app/about/AboutRoute.tsx`, `app/account/AccountRoute.tsx`, account saved/recovery pages, `app/ads/page.tsx`, `app/billing/page.tsx`, `app/concepts/subjects/page.tsx`, `app/concepts/topics/TopicDirectoryRoute.tsx`, `app/contact/ContactRoute.tsx`, dashboard routes, `app/pricing/PricingRoute.tsx`, `app/privacy/page.tsx`, `app/source/page.tsx`, and `app/terms/page.tsx`.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- Temporary Playwright DOM audit for affected routes and `/start` states: passed with exactly one visible `h1` per route.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"`: still fails only on the known `OML-QA-009` seeded `/start` heading expectation, not missing `h1` coverage.

## 2026-05-28 QA/UI/UX Pass

Current state: QA pass completed and follow-up work queued in `TASKS.md`. No product fixes were made in this pass.

### Scope Covered

- Public discovery routes: `/`, `/concepts`, `/concepts/subjects`, `/concepts/topics`, subject/topic detail pages, `/guided`, guided detail, track detail, `/challenges`, `/tests`, concept/topic/pack tests, `/tools`, chemistry tool, `/circuit-builder`, `/search`, pricing/account/billing/info pages, and zh-HK home/concept/start samples.
- Viewports: desktop 1440x1000 and mobile 390x844 for the custom route sweep; existing E2E specs cover additional widths.
- Manual screenshot review: home, concepts, SHM concept bench, pricing, account, tests, chemistry tool, circuit builder, and zh-HK home.
- Interaction spot checks: search query update, concept test rendering, chemistry route controls, circuit-builder preset/fit controls, and concept mode/control discovery.

### Artifacts

- Route sweep JSON: `output/qa-pass-2026-05-28/route-sweep.json`
- Route sweep summary: `output/qa-pass-2026-05-28/route-sweep-summary.json`
- Screenshots: `output/qa-pass-2026-05-28/screenshots/`
- Playwright failure artifacts: `output/playwright/test-results/`

### Validation Run

- `pnpm content:doctor`: passed. Subjects 4, topics 22, starter tracks 19, goal paths 10, concepts 97 published, no content doctor findings.
- `pnpm typecheck`: passed.
- Custom route sweep: 90 page/viewport visits completed. No 404/application-error pages found. Findings were converted into `TASKS.md`.
- Focused E2E subset:
  - Command: `pnpm exec playwright test tests/e2e/site-smoke.spec.ts tests/e2e/public-discovery-layout.spec.ts tests/e2e/header-footer-shell.spec.ts tests/e2e/mobile-cta-contrast.spec.ts tests/e2e/chemistry-reaction-mind-map.spec.ts tests/e2e/circuit-builder.spec.ts`
  - Result: 26 passed, 5 failed.
  - Deterministic product/layout failures: `OML-QA-002`, `OML-QA-003`.
  - Test/fixture/stability failures: `OML-QA-009`, `OML-QA-010`, `OML-QA-011`.
- Isolated rechecks:
  - `pnpm exec playwright test tests/e2e/site-smoke.spec.ts -g "signed-in free account"`: passed in isolation.
  - `pnpm exec playwright test tests/e2e/mobile-cta-contrast.spec.ts -g "other audited"`: failed in isolation with route navigation abort/timeout.
  - `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"`: failed on `/start` seeded-progress heading mismatch.
  - `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts -g "map-first on initial desktop"`: failed on `chem-node-carboxylate-salt` text overflow.
  - `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "keeps the builder row visible"`: failed with workspace starting below expected fold position.

### Open Work

Open tasks are tracked in `TASKS.md`:

- P0: `OML-QA-002`, `OML-QA-003`
- P1: `OML-QA-004`, `OML-QA-005`, `OML-QA-006`, `OML-QA-007`, `OML-QA-008`
- P2: `OML-QA-009`, `OML-QA-010`, `OML-QA-011`

Recommended next move: fix P0 tasks first, then rerun the focused E2E subset before starting the P1 polish pass.
