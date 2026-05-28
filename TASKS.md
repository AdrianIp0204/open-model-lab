# Open Model Lab Tasks

This checklist is the working queue for follow-up agents. When completing an item:

- Keep the checkbox state current.
- Add a short completion note under the task.
- Update `STATUS.md` with the date, files changed, and validation run.
- Prefer fixing the shared component or content seam instead of patching one route in isolation.

## QA Pass 2026-05-28

### P0 - Product Breakage / Failing Existing Gates

- [x] **OML-QA-001: Restore semantic `h1` coverage on public and account routes.**
  - Evidence: the 2026-05-28 route sweep reported no `h1` on `/concepts/subjects`, `/concepts/topics`, `/pricing`, `/account`, `/account/setups`, `/account/compare-setups`, `/account/study-plans`, `/dashboard`, `/dashboard/analytics`, `/billing`, `/about`, `/source`, `/contact`, `/privacy`, `/terms`, `/ads`, and `/zh-HK/concepts`. `tests/e2e/public-discovery-layout.spec.ts` also fails on `/start` because it expects a level-1 heading.
  - Likely cause: `SectionHeading` defaults to `level={2}` and multiple route hero sections use it as the visual page title without passing `level={1}`. `/start` also has dynamic hero states that need semantic parity.
  - Fix direction: audit each routed page's first visible page title and make exactly one visible or accessible `h1` per page. Prefer passing `level={1}` to `SectionHeading` where it is the page hero, or introduce a route-level hero wrapper that makes the semantic level explicit.
  - Include localized routes in the audit. Do not make a hidden duplicate `h1` if a visible heading can be the real `h1`.
  - Validation: run a Playwright/DOM sweep for all affected routes and rerun `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"`.

  - Completion note (2026-05-28 HKT): Set routed SectionHeading hero titles to level 1 across the affected public/account/dashboard pages; a temporary Playwright DOM audit confirmed each affected route, including zh-HK concepts and start-page states, exposes exactly one visible h1.
  - Validation: git diff --check passed; temporary Playwright h1 audit passed; pnpm typecheck passed; public-discovery visible-next-steps spec still fails only on existing OML-QA-009 seeded /start heading expectation.
- [x] **OML-QA-002: Fix the chemistry reaction mind map desktop node-label overflow.**
  - Evidence: `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts -g "map-first on initial desktop"` fails. The failing assertion reports `overflowingNodeText = ["chem-node-carboxylate-salt"]`.
  - Affected area: `components/tools/chemistry/ChemistryReactionGraph.tsx` and related layout data in `lib/tools/chemistry-reaction-mind-map.ts`.
  - Fix direction: keep the map-first desktop layout, but ensure the Carboxylate salt node label fits within its node at the default 1440px desktop viewport. Options: widen the node, adjust text wrapping/scaling, shorten the display label with accessible full text, or adjust the graph layout spacing.
  - Validation: rerun the single failing chemistry test, then rerun `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts`.

  - Completion note (2026-05-28 HKT): Increased the shared chemistry graph node height so the two-line `Carboxylate salt` label fits inside the desktop mind-map node without removing the map-first layout.
  - Validation: `git diff --check` and `git diff --check 07452fd^..07452fd` passed; `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts -g "map-first on initial desktop"` passed; full `pnpm exec playwright test tests/e2e/chemistry-reaction-mind-map.spec.ts` passed; `pnpm typecheck` passed.
- [x] **OML-QA-003: Bring the Circuit Builder workbench back above the fold on desktop and make the mobile first view usable.**
  - Evidence: `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "keeps the builder row visible"` fails with `workspaceBox.y = 335`, expected `< 240`. Mobile screenshot `output/qa-pass-2026-05-28/screenshots/mobile-circuit-builder.png` shows the workspace area mostly empty with the actual circuit/readout tiny near the bottom of the first viewport.
  - Affected area: `components/circuit-builder/CircuitBuilderPage.tsx` and related workspace/palette/inspector layout.
  - Fix direction: compact the hero/preset controls at desktop widths where the three-panel builder is expected to be visible, and improve mobile ordering/initial fit so the canvas is readable before the user scrolls deeply. Preserve the existing component library, workspace, inspector, and environment controls.
  - Validation: rerun the single failing circuit-builder test, full `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts`, and capture desktop 1440x900 plus mobile 390x844 screenshots.

  - Completion note (2026-05-28 HKT): Compacted the Circuit Builder hero and preset band, tightened the workspace controls/canvas frame, and moved mobile panels so the desktop bench starts above the fold and the mobile first view shows a readable workbench.
  - Validation: git diff --check passed; circuit-builder builder-row test passed; full circuit-builder spec passed (18/18); pnpm typecheck passed; desktop/mobile screenshots captured under output/qa-oml-qa-003-2026-05-28/orchestrator-screenshots/.

### P1 - UX / Accessibility Quality

- [x] **OML-QA-004: Stop clipping the active concept task copy in the concept bench.**
  - Evidence: desktop and mobile SHM screenshots show learning-critical text clipped in the first-action card: the title appears as `Build the first picture ...` and instruction text as `Press play, keep the...`. This weakens the core "Predict -> change -> observe -> explain -> check" loop.
  - Affected area: `components/concepts/ConceptPageV2Panels.tsx`, `components/simulations/SimulationShell.tsx`, and any shared first-action/interaction rail content.
  - Fix direction: remove or relax line clamps on active task title/instructions, allow the card to grow, or shorten the copy through the content seam. The learner must be able to read the full current task without hovering or guessing on desktop and mobile.
  - Validation: screenshot `/concepts/simple-harmonic-motion` and `/concepts/projectile-motion` at 1440x1000 and 390x844; verify no active task title/body truncation in the first viewport.

  - Completion note (2026-05-28 HKT): Removed the guided first-action active task line clamps so the active concept task title and instruction body wrap instead of clipping on SHM and projectile concept pages.
  - Validation: git diff --check passed; Playwright screenshot/DOM validation passed for SHM and projectile at 1440x1000 and 390x844; image inspection found no visible active-task clipping; pnpm typecheck passed.
- [ ] **OML-QA-005: Fix mobile horizontal overflow and cramped controls on the Chemistry Reaction Mind Map.**
  - Evidence: route sweep reported `horizontalOverflow = 87` on `/tools/chemistry-reaction-mind-map` at 390x844. Screenshot `mobile-tools-chemistry-reaction-mind-map.png` shows the graph title/description row and control chips clipped horizontally; the zoom range input is only about 8px high.
  - Affected area: `components/tools/chemistry/ChemistryReactionMindMapPage.tsx`, `components/tools/chemistry/ChemistryReactionGraph.tsx`.
  - Fix direction: ensure the graph header stacks cleanly on mobile, prevent page-level horizontal scroll, make control rows wrap or use an intentional internal scroller, and raise the range/touch controls to a usable hit area. Keep route controls reachable.
  - Validation: route sweep reports zero horizontal overflow at 390px; mobile screenshot shows no clipped graph title/control text; route controls and zoom controls remain usable.

- [ ] **OML-QA-006: Raise mobile tap targets for simulation controls and SVG drag handles.**
  - Evidence: route sweep found mobile interactive targets below 44px, including unit-circle drag point around 12x12, electric-field probe/source handles around 17-18px, concept mode buttons around 36px high, and several summary/disclosure controls around 20px high.
  - Affected area: simulation primitives such as `components/simulations/primitives/*`, concept bench tabs/buttons, and shared disclosure/summary controls.
  - Fix direction: use larger invisible hit areas around small visual handles, raise button/tab `min-height` to at least 44px on touch viewports, and preserve visible visual proportions where needed.
  - Validation: run a mobile DOM target-size audit over representative concepts (`simple-harmonic-motion`, `electric-fields`, `unit-circle-sine-cosine-from-rotation`, `projectile-motion`) and manually verify drag/tap behavior.

- [ ] **OML-QA-007: Reduce mobile floating-widget occlusion on learning and pricing surfaces.**
  - Evidence: mobile screenshots show the `Feedback` widget overlaying visible content on `/`, `/concepts`, `/pricing`, `/tests`, and `/circuit-builder`. Concept pages hide feedback, but other high-value surfaces still have first-viewport content under the floating button.
  - Affected area: `components/feedback/FeedbackWidget.tsx`, `components/layout/PageShell.tsx`, and page-level `showFeedbackWidget`/safe-area behavior.
  - Fix direction: reserve enough bottom space for mobile first-view cards, collapse the widget to a smaller icon where content density is high, or hide feedback on tool/workbench pages where it competes with primary controls. Avoid hiding the only feedback path on plain info pages.
  - Validation: mobile screenshots for home, concepts, pricing, tests, and circuit builder show no primary CTA, form field, graph, or card text under the widget.

- [ ] **OML-QA-008: Improve header brand truncation on desktop.**
  - Evidence: desktop screenshots show the header brand block truncated as `Open Mod...` plus a clipped subtitle on several pages, including home, SHM concept, chemistry tool, and circuit builder.
  - Affected area: `components/layout/SiteHeader.tsx` and related header/nav sizing.
  - Fix direction: make the brand name readable at common desktop widths, remove or hide the subtitle when space is tight, or set a wider/flex-safe brand column. Keep primary nav and account actions stable.
  - Validation: desktop screenshots at 1280px and 1440px show readable brand text without pushing nav controls off-screen.

### P2 - Test / QA Infrastructure

- [ ] **OML-QA-009: Make public discovery layout tests match `/start` dynamic progress states.**
  - Evidence: `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"` fails on `/start` because the test seeds local progress, then expects the first-time heading `Choose one bounded first step without guessing.`. The actual page correctly renders the saved-progress state heading `Resume where your saved work already points.`.
  - Affected area: `tests/e2e/public-discovery-layout.spec.ts` and `/start` test fixtures.
  - Fix direction: either split `/start` into first-time and seeded-progress cases, or update the seeded-progress expectation to the saved-progress heading while keeping a separate no-progress check for the first-time heading.
  - Validation: rerun the public discovery layout spec and verify both first-time and resume states are intentionally covered.

- [ ] **OML-QA-010: Stabilize the mobile dark-pill contrast audit.**
  - Evidence: `pnpm exec playwright test tests/e2e/mobile-cta-contrast.spec.ts -g "other audited"` fails in isolation with a timeout while navigating to `/tracks/motion-and-circular-motion` (`net::ERR_ABORTED; maybe frame was detached?`). In the broader subset it also produced a blank mobile screenshot with only the header/feedback visible.
  - Affected area: `tests/e2e/mobile-cta-contrast.spec.ts`, `tests/e2e/helpers.ts`, and potentially the track page's local-progress/session setup.
  - Fix direction: make the route loop deterministic by using fresh contexts per route or waiting for the track page's stable content marker instead of reusing a page across heavy route transitions. If the page itself aborts under seeded state, fix the route behavior.
  - Validation: rerun the isolated mobile contrast audit three times and then include it in the focused E2E subset.

- [ ] **OML-QA-011: Keep broad local Playwright sweeps from restarting the dev server mid-run.**
  - Evidence: during the 90-route desktop/mobile sweep, Next dev logged `Server is approaching the used memory threshold, restarting...`; transient zh-HK resource errors and one unstyled mobile screenshot occurred during that restart. The signed-in checkout smoke test failed only in the broad subset and passed in isolation, which points to suite pressure rather than a deterministic product failure.
  - Affected area: `playwright.config.ts`, large E2E specs, and future QA sweep scripts.
  - Fix direction: split broad sweeps into smaller shards, reuse contexts carefully, lower screenshot/full-page pressure, or run heavy visual sweeps against a production build/preview server instead of `next dev`.
  - Validation: rerun the focused subset without `ERR_EMPTY_RESPONSE`, `ERR_INCOMPLETE_CHUNKED_ENCODING`, `ERR_CONNECTION_REFUSED`, or dev-server memory restarts.
