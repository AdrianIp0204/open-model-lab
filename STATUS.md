# Open Model Lab Status

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
