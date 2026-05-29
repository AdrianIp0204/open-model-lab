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
- [x] **OML-QA-005: Fix mobile horizontal overflow and cramped controls on the Chemistry Reaction Mind Map.**
  - Evidence: route sweep reported `horizontalOverflow = 87` on `/tools/chemistry-reaction-mind-map` at 390x844. Screenshot `mobile-tools-chemistry-reaction-mind-map.png` shows the graph title/description row and control chips clipped horizontally; the zoom range input is only about 8px high.
  - Affected area: `components/tools/chemistry/ChemistryReactionMindMapPage.tsx`, `components/tools/chemistry/ChemistryReactionGraph.tsx`.
  - Fix direction: ensure the graph header stacks cleanly on mobile, prevent page-level horizontal scroll, make control rows wrap or use an intentional internal scroller, and raise the range/touch controls to a usable hit area. Keep route controls reachable.
  - Validation: route sweep reports zero horizontal overflow at 390px; mobile screenshot shows no clipped graph title/control text; route controls and zoom controls remain usable.

  - Completion note (2026-05-28 HKT): Stacked and wrapped the mobile chemistry graph header/status controls, raised route and zoom touch targets, and added a mobile regression covering overflow and control usability.
  - Validation: git diff --check passed; mobile chemistry overflow Playwright test passed; full chemistry-reaction-mind-map spec passed (4/4); screenshot/metrics showed horizontalOverflow 0 and fitted graph/control chips; pnpm typecheck passed.
- [x] **OML-QA-006: Raise mobile tap targets for simulation controls and SVG drag handles.**
  - Evidence: route sweep found mobile interactive targets below 44px, including unit-circle drag point around 12x12, electric-field probe/source handles around 17-18px, concept mode buttons around 36px high, and several summary/disclosure controls around 20px high.
  - Affected area: simulation primitives such as `components/simulations/primitives/*`, concept bench tabs/buttons, and shared disclosure/summary controls.
  - Fix direction: use larger invisible hit areas around small visual handles, raise button/tab `min-height` to at least 44px on touch viewports, and preserve visible visual proportions where needed.
  - Validation: run a mobile DOM target-size audit over representative concepts (`simple-harmonic-motion`, `electric-fields`, `unit-circle-sine-cosine-from-rotation`, `projectile-motion`) and manually verify drag/tap behavior.

  - Completion note (2026-05-28 HKT): Raised shared mobile control targets and enlarged invisible SVG drag hit areas for SHM, electric fields, unit circle, and projectile simulations while preserving visible handle proportions.
  - Validation: git diff --check passed; mobile target/drag audit over SHM, electric fields, unit circle, and projectile passed with failedTargetCount 0 and failedDragCount 0; screenshots inspected under output/qa-oml-qa-006-2026-05-28/orchestrator-qa-after-repair/; pnpm typecheck passed.
- [x] **OML-QA-007: Reduce mobile floating-widget occlusion on learning and pricing surfaces.**
  - Evidence: mobile screenshots show the `Feedback` widget overlaying visible content on `/`, `/concepts`, `/pricing`, `/tests`, and `/circuit-builder`. Concept pages hide feedback, but other high-value surfaces still have first-viewport content under the floating button.
  - Affected area: `components/feedback/FeedbackWidget.tsx`, `components/layout/PageShell.tsx`, and page-level `showFeedbackWidget`/safe-area behavior.
  - Fix direction: reserve enough bottom space for mobile first-view cards, collapse the widget to a smaller icon where content density is high, or hide feedback on tool/workbench pages where it competes with primary controls. Avoid hiding the only feedback path on plain info pages.
  - Validation: mobile screenshots for home, concepts, pricing, tests, and circuit builder show no primary CTA, form field, graph, or card text under the widget.

  - Completion note (2026-05-28 HKT): Converted the mobile feedback trigger to a compact in-flow 44px icon button, kept the desktop widget fixed, and hid the widget on Circuit Builder where it competes with workbench controls.
  - Validation: git diff --check passed; git diff --check 3bcedc2..HEAD passed; targeted FeedbackWidget/PageShell/CircuitBuilder vitest suite passed (8/8); mobile Playwright screenshot/overlap validation passed for `/`, `/concepts`, `/pricing`, `/tests`, and `/circuit-builder` with failureCount 0; pnpm typecheck passed; pnpm lint passed.
- [x] **OML-QA-008: Improve header brand truncation on desktop.**
  - Evidence: desktop screenshots show the header brand block truncated as `Open Mod...` plus a clipped subtitle on several pages, including home, SHM concept, chemistry tool, and circuit builder.
  - Affected area: `components/layout/SiteHeader.tsx` and related header/nav sizing.
  - Fix direction: make the brand name readable at common desktop widths, remove or hide the subtitle when space is tight, or set a wider/flex-safe brand column. Keep primary nav and account actions stable.
  - Validation: desktop screenshots at 1280px and 1440px show readable brand text without pushing nav controls off-screen.

### P2 - Test / QA Infrastructure

  - Completion note (2026-05-28 HKT): Made the desktop header brand column flex-safe, hid the route subtitle at common desktop widths, and compacted secondary header labels so Open Model Lab stays readable without displacing nav/account controls.
  - Validation: git diff --check passed; header-footer-shell Playwright spec passed (2/2); screenshot inspection passed for home, SHM concept, chemistry tool, and circuit builder at 1280px and 1440px; pnpm typecheck passed; pnpm lint passed
- [x] **OML-QA-009: Make public discovery layout tests match `/start` dynamic progress states.**
  - Evidence: `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"` fails on `/start` because the test seeds local progress, then expects the first-time heading `Choose one bounded first step without guessing.`. The actual page correctly renders the saved-progress state heading `Resume where your saved work already points.`.
  - Affected area: `tests/e2e/public-discovery-layout.spec.ts` and `/start` test fixtures.
  - Fix direction: either split `/start` into first-time and seeded-progress cases, or update the seeded-progress expectation to the saved-progress heading while keeping a separate no-progress check for the first-time heading.
  - Validation: rerun the public discovery layout spec and verify both first-time and resume states are intentionally covered.

  - Completion note (2026-05-28 HKT): Split the public discovery layout `/start` coverage into explicit no-progress and seeded-progress route cases, seeded local progress only for cases that ask for it, and refreshed stale heading expectations to match current page copy.
  - Validation: git diff --check passed; `pnpm exec eslint tests/e2e/public-discovery-layout.spec.ts` passed; `pnpm typecheck` passed; `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"` passed the `/start` first-time and saved-progress cases before failing on a separate `/search` mobile CTA placement issue now tracked as `OML-QA-012`.
- [x] **OML-QA-010: Stabilize the mobile dark-pill contrast audit.**
  - Evidence: `pnpm exec playwright test tests/e2e/mobile-cta-contrast.spec.ts -g "other audited"` fails in isolation with a timeout while navigating to `/tracks/motion-and-circular-motion` (`net::ERR_ABORTED; maybe frame was detached?`). In the broader subset it also produced a blank mobile screenshot with only the header/feedback visible.
  - Affected area: `tests/e2e/mobile-cta-contrast.spec.ts`, `tests/e2e/helpers.ts`, and potentially the track page's local-progress/session setup.
  - Fix direction: make the route loop deterministic by using fresh contexts per route or waiting for the track page's stable content marker instead of reusing a page across heavy route transitions. If the page itself aborts under seeded state, fix the route behavior.
  - Validation: rerun the isolated mobile contrast audit three times and then include it in the focused E2E subset.

  - Completion note (2026-05-28 HKT): Stabilized the other-audited mobile dark-pill contrast loop by opening each route in a fresh mobile browser context, waiting for route-specific ready markers, and closing each context after the contrast assertion.
  - Validation: git diff --check passed; eslint passed for tests/e2e/mobile-cta-contrast.spec.ts; isolated mobile contrast audit passed 3/3 runs; pnpm typecheck passed; focused subset included mobile contrast passing, with remaining failures matching existing OML-QA-012 /search CTA and OML-QA-011 dev-server restart instability.
- [x] **OML-QA-011: Keep broad local Playwright sweeps from restarting the dev server mid-run.**
  - Evidence: during the 90-route desktop/mobile sweep, Next dev logged `Server is approaching the used memory threshold, restarting...`; transient zh-HK resource errors and one unstyled mobile screenshot occurred during that restart. The signed-in checkout smoke test failed only in the broad subset and passed in isolation, which points to suite pressure rather than a deterministic product failure.
  - Affected area: `playwright.config.ts`, large E2E specs, and future QA sweep scripts.
  - Fix direction: split broad sweeps into smaller shards, reuse contexts carefully, lower screenshot/full-page pressure, or run heavy visual sweeps against a production build/preview server instead of `next dev`.
  - Validation: rerun the focused subset without `ERR_EMPTY_RESPONSE`, `ERR_INCOMPLETE_CHUNKED_ENCODING`, `ERR_CONNECTION_REFUSED`, or dev-server memory restarts.

  - Completion note (2026-05-28 HKT): Added a shardable local QA sweep runner that launches broad Playwright specs on isolated ports with separate artifact folders, scans each shard log for dev-server restart/connection instability, and lets known product/test failures be reported separately from infra instability.
  - Validation: git diff --check passed; node --check passed for scripts/run-playwright-qa-sweep.mjs; eslint passed for playwright.config.ts and scripts/run-playwright-qa-sweep.mjs; pnpm typecheck passed; pnpm test:e2e:qa-sweep --allow-test-failures passed with hasInstability false and no restart/connection instability matches. Remaining failures are separate tracked issues: OML-QA-012 and OML-QA-013.
- [x] **OML-QA-012: Keep `/search` primary CTA visible in the mobile public discovery layout audit.**
  - Evidence: after the `OML-QA-009` repair, `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"` fails at `site search with saved progress (/search) @ mobile-390x844`: `search-primary-cta` top is `1173`, expected `< 844`. Log: `output/qa-oml-qa-009-2026-05-28/orchestrator-qa/playwright-public-discovery-layout.log`; trace/artifacts: `output/playwright/test-results/public-discovery-layout-ke-935ad-ext-steps-across-key-widths-chromium/`.
  - Affected area: `components/search/SearchPage.tsx` and possibly the mobile search hero/filter/saved-progress stack.
  - Fix direction: compact or reorder the mobile search page first viewport so a clear primary next-step CTA appears before the fold while preserving search/filter usability and desktop layout.
  - Validation: rerun `pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps"` and verify `/start` first-time, `/start` saved-progress, and `/search` mobile cases all pass intentionally.
  - Completion note (2026-05-28 HKT): Moved the saved-progress primary CTA ahead of the mobile search filter/guide stack while preserving the desktop filter-first order.
  - Validation: git diff --check passed; pnpm exec eslint components/search/SearchPage.tsx passed; pnpm typecheck passed; pnpm exec playwright test tests/e2e/public-discovery-layout.spec.ts -g "visible next steps" passed.
- [x] **OML-QA-013: Restore signed-in account plan links in the site smoke flow.**
  - Evidence: `pnpm test:e2e:qa-sweep --allow-test-failures` shard 6 failed `tests/e2e/site-smoke.spec.ts` after the dev-server instability fix, without any restart or connection-instability matches. The free checkout flow could not find `getByRole("link", { name: "Free learner Free tier" })`; the premium management flow could not find `getByRole("link", { name: "Supporter learner Supporter" })`. Log: `output/playwright/qa-sweep/2026-05-28T12-40-33-301Z/shard-06.log`; artifacts: `output/playwright/test-results-qa-sweep-6-site-smoke.spec/`.
  - Affected area: `tests/e2e/site-smoke.spec.ts`, signed-in account/pricing header or account summary links, and recent compact account-label behavior.
  - Fix direction: decide whether the current UI should expose the plan tier in the accessible link name or whether the smoke test should target the updated account link semantics. Keep the account status and plan tier discoverable to assistive tech.
  - Validation: rerun `pnpm exec playwright test tests/e2e/site-smoke.spec.ts` and then `pnpm test:e2e:qa-sweep --allow-test-failures` to verify shard 6 no longer fails except for any separately tracked task.

  - Completion note (2026-05-28 HKT): Added signed-in desktop and mobile account link aria labels that include the account display name plus plan tier while preserving the compact visual header label.
  - Validation: git diff --check passed; git diff --check HEAD^..HEAD passed; pnpm exec playwright test tests/e2e/site-smoke.spec.ts passed; pnpm typecheck passed; pnpm test:e2e:qa-sweep --allow-test-failures passed with ok true, no instability matches, and no test failures
- [x] **OML-QA-014: Remove the visible `Try this first` rail from guided concept benches.**
  - Evidence: Adrian's mobile Uniform Circular Motion screenshot showed a large `Try this first` card between the live model and controls, pushing controls down and duplicating guidance that already exists in the guided step rail.
  - Affected area: `components/simulations/ConceptSimulationRenderer.tsx`, `app/globals.css`, concept-page i18n copy, concept V2/layout tests, and Help / Tutorial concept-page hints.
  - Fix direction: remove the guided first-action rail from active guided concept benches, keep the current task/action/check in the existing guided step rail, and move the general predict-change-observe-explain-check guidance into the Help / Tutorial concept-page copy.
  - Validation: rerun focused concept V2 flow, representative concept layout/mobile ordering, component/i18n tests, lint, and typecheck.

  - Completion note (2026-05-28 HKT): Removed the guided first-action rail, renamed remaining concept-page `Try this first` labels to neutral guided/bench-preview labels, and expanded concept Help / Tutorial copy with the first-move loop.
  - Validation: git diff --check passed; focused eslint passed; concept-page-v2-panels and onboarding zh-HK vitest passed 26/26; pnpm typecheck passed; concept-page-v2-flow Playwright passed 16/16; focused concept-layout Playwright passed 3/3 for guided live lab, Projectile Motion phone order, and Uniform Circular Motion desktop/mobile.

### P1 - Concept Page QA / UI-UX Pass 2026-05-28 Night

- [x] **OML-QA-015: Put the current guided task back inside the first usable bench viewport without restoring the old `Try this first` rail.**
  - Evidence: the 2026-05-28 night concept QA sweep showed `concept-v2-current-step-card` starts far below the first viewport on representative concepts: desktop y was about `1560-2576px`, phone y was about `1400-1771px`, while the first viewport only shows the model, controls, and sometimes part of the graph. Screenshots: `output/concept-qa-pass-2026-05-28/2026-05-28T15-17-02-393Z/screenshots/desktop-1440x900-simple-harmonic-motion.png`, `phone-390x844-simple-harmonic-motion.png`, and `phone-390x844-electric-fields.png`.
  - UX problem: after `OML-QA-014`, the page no longer duplicates the old first-action rail, but a first-time learner no longer sees the current guided action while using the controls. The bench says what the model is, not what to do next.
  - Affected area: `components/concepts/ConceptPageV2Shell.tsx`, `components/concepts/ConceptPageV2Panels.tsx`, `components/simulations/ConceptSimulationRenderer.tsx`, `components/simulations/SimulationShell.tsx`, and focused concept V2/layout tests.
  - Fix direction: add a compact current-step surface near the live bench, not a large duplicate card. On desktop, place a one- or two-line current task near the controls/right rail or directly below the visual stage. On phone, show the current step goal/action between the scene and controls or as a compact sticky/anchored bench cue. Keep the full lesson rail lower on the page if useful, but make the first visible cue answer "what should I do now?"
  - Constraints: do not reintroduce `simulation-shell-first-action` / `concept-v2-guided-first-action`; do not put a full paragraph-heavy card above controls; keep the model/controls first and the cue scannable.
  - Validation: run a DOM/screenshot audit over at least `simple-harmonic-motion`, `uniform-circular-motion`, `projectile-motion`, `electric-fields`, `unit-circle-sine-cosine-from-rotation`, and `acid-base-ph-intuition` at `1440x900`, `820x1180`, `390x844`, and `360x740`. Assert the compact current-step cue is visible before or within the first viewport, includes the current step count/goal/action, and no old first-action rail test IDs are present.

  - Completion note (2026-05-28 HKT): Added a compact current-step bench cue near the live model/controls so guided concept pages show the step count, goal, and action inside the first usable bench viewport without restoring the old first-action rail.
  - Validation: git diff --check; git diff --check HEAD^..HEAD; pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-015"; pnpm typecheck; screenshot inspection of representative desktop/tablet/phone cue captures
- [x] **OML-QA-016: Compact the mobile concept control stack so controls do not bury the graph and guided task.**
  - Evidence: phone screenshots show controls consuming most of the first 1.5-2 viewports; e.g. `phone-390x844-simple-harmonic-motion.png`, `phone-390x844-conservation-of-momentum.png`, and `short-phone-360x740-reaction-rate-collision-theory.png`. The first guided step appears around `1400-1771px`; prediction starts around `2254-2925px`; overlays and equation map often start around `2600-4087px`.
  - UX problem: the controls are usable but oversized. A learner on a phone sees huge slider cards and preset cards before the page shows the guided task, prediction, overlays, or equation tools.
  - Affected area: `components/simulations/ControlPanel.tsx`, `components/simulations/SimulationShell.tsx`, `components/simulations/ConceptSimulationRenderer.tsx`, shared simulation control primitives, and concept layout tests.
  - Fix direction: on phone widths, show only the guided/primary controls expanded by default, collapse secondary controls and presets behind clear "More controls" / "Presets" disclosures, and make Reset compact. Preserve 44px touch targets, labels, values, and keyboard access. Avoid hiding a control that the active guided step reveals.
  - Validation: on `390x844` and `360x740`, the scene, compact current task, primary controls, and at least the graph heading or first graph card should appear within roughly the first 1.5 viewports for SHM/UCM/projectile/electric-fields/unit-circle/reaction-rate. Run the mobile tap-target audit again and verify no small-target regressions.

  - Completion note (2026-05-29 HKT): Collapsed phone presets into their own disclosure, kept secondary controls behind More controls, removed the guided-reveal force-open path, and kept primary controls plus the graph surface within the mobile 1.5-viewport target.
  - Validation: git diff --check passed; git diff --check HEAD^..HEAD passed for worker patch; pnpm test tests/components/controlPanel.test.tsx passed; pnpm exec playwright test tests/e2e/concept-layout.spec.ts -g "OML-QA-016" passed; screenshot/metric audit over SHM, UCM, projectile, electric fields, unit circle, and reaction rate at 390x844 and 360x740 passed for control-stack layout; pnpm typecheck passed. Existing small touch-target findings remain tracked by OML-QA-024.
- [x] **OML-QA-017: Make guided rail quick checks genuinely interactive or stop making them look like answerable checks.**
  - Evidence: feature probes on SHM and UCM found `concept-v2-rail-inline-check` with three choices but `interactiveChoiceCount: 0`. The choices are styled like selectable options, yet they are static list items. The separate `Prediction prompt` below repeats a very similar interaction with real buttons.
  - UX problem: the learner sees "Quick check" and answer choices, but cannot choose or get feedback. This makes the guided rail feel broken and duplicates the prediction feature.
  - Affected area: `components/concepts/ConceptPageV2Panels.tsx`, `lib/content/concept-page-v2.ts`, `components/concepts/PredictionModePanel.tsx`, concept-page progress hooks, and relevant tests.
  - Fix direction: choose one consistent interaction model. Preferred: wire inline-check choices to an existing prediction/quick-test interaction state with selectable buttons/radio semantics, selected/correct/incorrect feedback, and an optional "Test in bench" action. If that is too large for the first patch, rename/restyle the rail content as a non-interactive "Think about" cue and expose the real prediction panel from that cue instead.
  - Deduplication requirement: after the fix, the same prompt should not appear twice back-to-back as both a static rail card and a separate prediction panel. The learner should get one clear check path.
  - Validation: Playwright should select an inline guided check answer on SHM and UCM, observe feedback/state, and still allow advancing steps. Accessibility checks should confirm the choices are buttons/radios if interactive; if non-interactive, the section must not use "Quick check" copy or option styling.

  - Completion note (2026-05-29 HKT): Made guided rail/support quick-check choices interactive with radio semantics, selected/correct/incorrect feedback, preserved answer metadata from prediction/quick-test content, and hid the duplicate secondary prediction drawer while an inline guided check is active.
  - Validation: git diff --check passed; pnpm test tests/components/concept-page-v2-panels.test.tsx -- --runInBand passed; pnpm exec playwright test tests/e2e/concept-page-v2-flow.spec.ts --grep "OML-QA-017" passed; pnpm validate:content passed; pnpm typecheck passed.
- [x] **OML-QA-018: Expose or deliberately retire Compare mode on guided concept pages.**
  - Evidence: feature probes on SHM, UCM, and Acid/Base at desktop and phone widths found no visible Compare tab/button on the guided concept bench (`compareVisibleTextCount: 0`, no real compare controls). Yet concept copy, onboarding surfaces, and some bench content still mention compare mode, and the renderer still has compare-mode code paths.
  - UX problem: Compare is treated as a core OML feature but is not reachable in the normal guided concept page flow. A user cannot discover it from the bench even when the page asks them to compare states.
  - Affected area: `components/simulations/ConceptSimulationRenderer.tsx`, `components/concepts/ConceptPageV2Shell.tsx`, `ConceptPageV2` help/tutorial copy, compare saved setup UI, and concept V2 tests.
  - Fix direction: either expose Compare as a compact, non-crowding bench tool in guided mode, or remove Compare from guided-page onboarding/help/copy until it is available. If exposed, it should work on desktop and phone: enter Compare, edit Setup A/B, swap/reset/exit, and return to the guided step without losing the current step context.
  - Validation: Playwright should enter and exit Compare mode on at least SHM, electric-fields, and acid-base concept pages at desktop and phone widths. If intentionally retired instead, tests should assert no Compare claims remain in help/onboarding/current-step copy.

  - Completion note (2026-05-29 HKT): Exposed Compare as a compact guided bench control so learners can enter Compare, edit Setup A/B, swap/reset/exit, and return to the current guided step without losing context.
  - Validation: git diff --check passed; git diff --check HEAD^..HEAD passed; pnpm exec eslint components/simulations/ConceptSimulationRenderer.tsx tests/components/concept-simulation-renderer-compare.test.tsx tests/e2e/concept-page-v2-flow.spec.ts passed; pnpm exec vitest run tests/components/concept-simulation-renderer-compare.test.tsx passed; pnpm test:e2e:concept-v2 --grep "OML-QA-018" passed; pnpm typecheck passed.
- [x] **OML-QA-019: Turn buried prediction, overlay, and equation-map support into contextual bench tools.**
  - Evidence: in the representative sweep, prediction panels started around `2245-3448px`, guided overlays around `2323-3526px`, and equation map disclosures around `2872-4087px` from the top. On phone, these tools are several screens below the live model and controls even though the guided step says they are "Now available."
  - UX problem: the support tools are useful, but they are discovered only after deep scrolling. The current "Now available" chips tell the learner what exists without giving a nearby way to open it.
  - Affected area: `ConceptPageV2LessonRail`, `ConceptSimulationRenderer`, `GuidedOverlayPanel`, `EquationPanel`, `PredictionModePanel`, Help / Tutorial copy, and concept V2/layout tests.
  - Fix direction: make each active step's revealed tools actionable from the compact current-step cue or a small "Tools" drawer near the bench. Examples: tapping `Overlay: Motion trail` opens/focuses the overlay controls; tapping `Graph: Velocity over time` switches graphs; tapping `Equation A` opens a compact equation snippet; tapping `Prediction` opens the interactive prediction prompt. Keep full panels available lower down, but do not require deep scrolling for first use.
  - Validation: for SHM and UCM, click each kind of reveal chip/control/graph/overlay/equation/prediction from the visible guided step surface and verify the bench changes focus or opens the matching tool within the same viewport. Phone screenshots should show the opened tool without pushing the learner thousands of pixels down page.

  - Completion note (2026-05-29 HKT): Added contextual Step tools beside the current-step cue so revealed controls, graphs, overlays, equations, and prediction prompts can be opened from the live bench instead of deep-scrolling to lower support panels.
  - Validation: git diff --check HEAD^..HEAD passed; pnpm exec eslint components/simulations/ConceptSimulationRenderer.tsx tests/e2e/concept-page-v2-flow.spec.ts passed; pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g OML-QA-019 passed; phone screenshots inspected for SHM and UCM; pnpm typecheck passed.
- [x] **OML-QA-020: Reduce first-viewport text density and card count on concept pages.**
  - Evidence: the 48-page representative sweep reported high first-viewport text density on 47/48 routes. Examples: desktop electric-fields `458` words, conservation-of-momentum `480` words; phone binary-search `334`, reaction-rate `339`, conservation-of-momentum `382`. Screenshots confirm the first viewport mixes title, simulation description, control explanations, readouts, graph copy, floating widgets, and many bordered surfaces.
  - UX problem: the page is simulation-first structurally, but visually it still reads as dense. Teen/mobile users should see one clear experiment and one clear next action before support text.
  - Affected area: concept bench header copy, `ControlPanel` descriptions, `SimulationShell` graph header/copy, concept content `simulation.description` strings, and shared typography/card density.
  - Fix direction: shorten first-viewport bench descriptions to one line on mobile, move longer explanations into Help / Tutorial or disclosures, reduce nested card borders in the first viewport, and prefer compact visual labels/readouts. Use color/visual state to carry more of the explanation instead of repeating paragraphs near the stage.
  - Validation: repeat the custom first-viewport density audit. Target: representative phone concept pages should stay below roughly `180` visible words in the first viewport, and desktop/tablet pages below roughly `260`, unless a specific concept has a justified exception. Screenshots must still show the concept title, live visual, controls, and current task clearly.

  - Completion note (2026-05-29 HKT): Reduced first-viewport density across representative concept pages by hiding secondary control/graph prose from the live bench, compacting current-step copy without clipping the action, collapsing Step tools by default, and trimming dense simulation readouts.
  - Validation: git diff --check passed; representative OML-QA-020 first-viewport density audit passed with desktop/tablet under 260 words and phone/short-phone under 180; current-step cue regression passed; representative screenshots inspected with no blocker; pnpm typecheck passed.
- [x] **OML-QA-021: Improve mobile simulation visual readability before adding more text.**
  - Evidence: mobile screenshots show several live visuals/readouts are too small to inspect: electric-fields readout/labels, unit-circle sign map, conservation-of-momentum labels, and reaction-rate particle/readout details. Some scenes devote large space to explanatory headers while the actual measurable visual is cramped.
  - UX problem: the concept page depends on the model being inspected, but on phone the important visual state often becomes tiny text or a small diagram inside a large framed bench.
  - Affected area: representative simulation components (`ElectricFieldsSimulation`, `UnitCircleRotationSimulation`, `ConservationMomentumSimulation`, `ReactionRateCollisionTheorySimulation`, and shared readout/graph primitives).
  - Fix direction: add mobile visual-priority layouts per simulation family: enlarge the core visual, hide or collapse dense readout tables into a tappable readout panel, increase essential SVG labels, and remove nonessential microcopy from inside the scene. Prefer stronger, larger visuals over adding explanatory cards.
  - Validation: capture `390x844` and `360x740` screenshots for the four named concepts. A reviewer should be able to identify the main objects, active variable, and live output without zooming. Keep accessibility text/readouts available outside the visual where hidden.

  - Completion note (2026-05-29 HKT): Enlarged the mobile live visuals for electric fields, unit circle, conservation of momentum, and reaction-rate scenes, moved dense readouts into a 44px mobile readout disclosure, and kept core objects/active outputs identifiable in phone screenshots.
  - Validation: git diff --check passed; targeted eslint passed; affected simulation component vitest suite passed 10/10; OML-QA-021 Playwright mobile visual audit passed at 390x844 and 360x740 with screenshots under output/qa-oml-qa-021-2026-05-29/orchestrator-visual-audit/; pnpm typecheck passed
- [x] **OML-QA-022: Prevent floating Coach / Feedback controls from covering concept bench content.**
  - Evidence: concept screenshots show the floating `Coach` trigger overlapping the graph/control area on desktop and the preset/control area on phone. Examples: `desktop-1440x900-simple-harmonic-motion.png`, `phone-390x844-simple-harmonic-motion.png`, and `phone-390x844-electric-fields.png`. The earlier feedback-widget fix reduced general mobile feedback overlap, but concept pages still have the AI coach floating over learning surfaces.
  - UX problem: floating helper buttons compete with the simulation and can cover labels, presets, graph headers, or controls. A help/coach affordance is useful, but not as an overlay on top of the active bench.
  - Affected area: `components/ai/AiLearningCoachPanel.tsx`, `components/feedback/FeedbackWidget.tsx`, `PageShell`, and concept page layout.
  - Fix direction: on concept pages, move Coach into a non-overlapping header/help/tool area or an in-flow compact panel below the live bench; alternatively reserve safe space and keep it outside protected learning zones. Keep Help/Tutorial and Coach conceptually distinct: Help explains the page; Coach helps with the current concept.
  - Validation: add a Playwright overlap check for `data-protected-learning-zone="concept-live-lab"` against coach/feedback triggers at desktop, tablet, and phone widths. Screenshots should show no trigger over the live scene, controls, graph, current task, or preset cards.

  - Completion note (2026-05-29 HKT): Moved concept-page Coach into an in-flow bench helper and routed concept feedback inline so neither helper floats over the protected live lab.
  - Validation: git diff --check HEAD^..HEAD passed; targeted eslint passed; ai-coach floating layout Playwright spec passed 4/4; loaded visual audit passed with screenshots; pnpm typecheck passed
- [x] **OML-QA-023: Rationalize post-bench support sections so concept pages do not accumulate duplicate "next step" surfaces.**
  - Evidence: after the live bench, the page stacks status/progress, wrap-up, reference, bench tools/share links, progress/next steps, ads, and the AI coach. Code paths involved: `ConceptPageV2Shell` post-lab context/wrap-up/reference, `ConceptPageFramework` bench utilities/progress disclosures, and `AiLearningCoachPanel`.
  - UX problem: several sections are individually reasonable but collectively feel like a long pile of support cards. The learner can hit multiple "next step", progress, share, and help-like surfaces without knowing which one matters.
  - Affected area: `components/concepts/ConceptPageFramework.tsx`, `ConceptPageV2Shell.tsx`, `ConceptProgressCard`, `ConceptShareLinksPanel`, `AiLearningCoachPanel`, and post-lab tests.
  - Fix direction: define one post-bench information architecture: primary wrap-up/practice path, secondary reference/equation details, utilities/share/progress tucked under one predictable disclosure, and Coach as a contextual helper rather than another competing section. Remove or merge duplicate copy where two sections promise the same next step.
  - Validation: inspect SHM, UCM, electric-fields, acid-base, and binary-search after completing the guided steps. There should be one obvious primary next action, one reference path, and one utility/progress area. Add a route-level snapshot/DOM assertion for the final section order.

  - Completion note (2026-05-29 HKT): Consolidated post-bench support into one IA: wrap-up as the primary practice path, reference as the secondary explanation path, and study tools/progress/share/coach tucked into one disclosure.
  - Validation: git diff --check 2808af6..HEAD passed; targeted eslint passed; concept-page-framework component tests passed; post-bench IA Playwright gate passed for SHM, UCM, electric fields, acid/base, and binary search; pnpm typecheck passed.

- [x] **OML-QA-024: Close remaining concept-page touch-target gaps found outside the earlier mobile target audit.**
  - Evidence: the 2026-05-28 night sweep still found mobile targets below the 44px floor. Concept-specific examples include the UCM draggable particle around `22x15px` on `phone-390x844` and the binary-search `Linear contrast` checkbox around `20x20px`; the header brand link also reports around `158x28px` on phone concept pages.
  - Affected area: `UniformCircularMotionSimulation`, `BinarySearchHalvingSimulation`/control primitives, `SiteHeader`, and the mobile target-size audit coverage.
  - Fix direction: add invisible hit regions around the UCM particle like the previous SVG-drag repairs, increase checkbox/toggle hit wrappers for simulation boolean controls, and make the mobile brand link hit area at least 44px tall without visually bloating the header.
  - Validation: extend the mobile target audit to include `uniform-circular-motion` and `binary-search-halving-the-search-space` plus one standard physics concept. The audit should report zero visible interactive targets below 44px in the first 1.5 viewports, excluding deliberate non-touch SVG internals that have a larger parent hit area.

  - Completion note (2026-05-29 HKT): Added a 44px invisible UCM particle hit target, reworked boolean simulation controls so their accessible label target is 44px, raised the mobile brand link hit area, and added the focused first-screen mobile touch-target audit for UCM, binary search, and SHM.
  - Validation: git diff --check HEAD^..HEAD passed for worker patch `e33f7fe`; targeted eslint passed; ControlPanel/SiteHeader vitest suite passed 14/14; concept-mobile-touch-targets Playwright gate passed; pnpm typecheck passed.

## i18n / Translation QA Pass 2026-05-29

### P0 - Translation Coverage / Mixed-Language Product Surface

- [x] **OML-QA-025: Make the zh-HK overlay validation gate runnable locally and then green.**
  - Evidence: `pnpm i18n:validate -- --locale zh-HK` fails immediately on this Mac because the package script calls `python`, but only `python3` is available in the current shell path. Running the validator directly with `python3 tools/i18n/validate_overlays.py --locale zh-HK` returns `valid: false`.
  - Validator evidence from 2026-05-29 HKT: `52` problems, `94` stale items, `46` concept output-hash mismatches, and six structural overlay errors.
  - Structural errors to repair:
    - `content/i18n/zh-HK/concepts/binary-search-halving-the-search-space.json`: `sections.explanation.paragraphs` has 2 items while canonical has 3.
    - `content/i18n/zh-HK/concepts/doppler-effect.json`: `sections.workedExamples.items.id:front-vs-rear-spacing.resultTemplate` is present even though `resultTemplate` is not translatable for overlays.
    - `content/i18n/zh-HK/concepts/electromagnetic-induction.json`: `sections.keyIdeas` has 4 items while canonical has 5.
    - `content/i18n/zh-HK/concepts/equivalent-resistance.json`: `sections.commonMisconception.correction` has 2 items while canonical has 3.
    - `content/i18n/zh-HK/concepts/keplers-third-law-orbital-periods.json`: `challengeMode.items.id:ktl-ch-inner-vs-outer-years.hints` has 2 items while canonical has 3.
    - `content/i18n/zh-HK/concepts/reaction-rate-collision-theory.json`: `challengeMode.items.id:rrct-ch-more-success-not-just-more-hits.targets` has 3 items while canonical has 5.
  - Fix direction: update the package scripts to call the repo-supported Python command reliably on macOS, then repair the six structural overlay files, refresh generated i18n artifacts and manifests, and resolve stale/hash-mismatch entries instead of bypassing the validator.
  - Validation: `pnpm i18n:validate -- --locale zh-HK` must run without a missing-`python` shell error and return `valid: true`; then rerun `pnpm content:registry`, `pnpm i18n:check:zh-HK`, `pnpm exec vitest run tests/i18n tests/app/public-route-i18n.test.ts tests/components/locale-switcher.test.tsx tests/app/locale-redirects.test.ts`, and `pnpm typecheck`.

  - Completion note (2026-05-29 HKT): Made the zh-HK overlay validator runnable through pnpm/python3, repaired the six structural zh-HK overlays, and refreshed generated zh-HK i18n artifacts.
  - Validation: git diff --check passed; pnpm i18n:validate -- --locale zh-HK passed with valid true; pnpm content:registry passed; pnpm i18n:check:zh-HK passed with issueCount 0; pnpm exec vitest run tests/i18n tests/app/public-route-i18n.test.ts tests/components/locale-switcher.test.tsx tests/app/locale-redirects.test.ts passed 76/76; pnpm typecheck passed
- [x] **OML-QA-026: Finish zh-HK concept translation coverage so concept pages do not ship partial English fallback copy.**
  - Evidence: `pnpm i18n:sweep:zh-HK -- --autostart` checked `139` public zh-HK routes plus signed-in account routes and failed with `105` visible `ENGLISH_LEAK` findings. `97` of those findings are concept routes.
  - Representative visible leaks: `/zh-HK/concepts/simple-harmonic-motion` shows `Build the first picture on the live bench before you analyse the graphs.`; `/zh-HK/concepts/wave-speed-wavelength` shows `Live setup`; `/zh-HK/concepts/pitch-frequency-loudness-intensity` shows `Tie pitch to frequency, period, and compression spacing instead of to wave height.`; `/zh-HK/concepts/collisions` shows `Collide two carts on one honest track, keep total momentum in view`; `/zh-HK/concepts/matrix-transformations` shows `The two matrix columns are the images of the two basis vectors.`
  - Worklist evidence: the checked-in `content/_meta/generated/i18n-worklist-zh-HK.json` is old (`generatedAt: 2026-04-12T13:31:48.403Z`) and reports `86` concepts with `6730` fallback fields. Its largest fallback buckets include `gravitational-potential-energy`, `escape-velocity`, `circular-orbits-orbital-speed`, `rolling-motion`, `series-parallel-circuits`, `total-internal-reflection`, `pressure-and-hydrostatic-pressure`, `resonance-air-columns-open-closed-pipes`, `angular-momentum`, and `static-equilibrium-centre-of-mass`.
  - Fix direction: regenerate the zh-HK worklist after the latest content changes, translate the remaining concept overlay fields in batches, and review the rendered concept pages rather than relying only on structural validation. Prioritize concept fields that appear above the fold: guided step goals/actions, simulation descriptions, scene labels, readout labels, graph labels, overlay labels, quick checks, challenge prompts, read-next titles, and concept relationship titles.
  - Validation: `pnpm i18n:worklist -- --locale zh-HK` should report no fallback fields for published concept pages intended to be localized; `pnpm i18n:validate -- --locale zh-HK`, `pnpm i18n:check:zh-HK`, and `pnpm i18n:sweep:zh-HK -- --autostart` must all pass with zero visible English-leak findings except explicitly allowlisted product names, math symbols, URLs, emails, and code-like tokens.

  - Completion note (2026-05-29 HKT): Translated and regenerated zh-HK concept overlays, expanded overlay extraction/validation to cover current concept surfaces, and added a zh-HK visible-text guard for remaining hardcoded runtime concept strings so the browser sweep is clean.
  - Validation: git diff --check; pnpm i18n:worklist -- --locale zh-HK; pnpm i18n:validate -- --locale zh-HK; pnpm i18n:check:zh-HK; pnpm i18n:sweep:zh-HK -- --autostart; pnpm typecheck
- [x] **OML-QA-027: Fix non-concept zh-HK leakage on pricing, billing, start/search, and signed-in account surfaces.**
  - Evidence from the 2026-05-29 browser sweep outside concept pages:
    - `/zh-HK/pricing`: `Circuit Builder、Chemistry Reaction Mind Map 等學習工具`
    - `/zh-HK/billing`: `Open Model Lab Supporter`
    - `/zh-HK/start`: `Start Graph transforms`
    - `/zh-HK/search`: `打開 Kirchhoff rules`
    - `/zh-HK/account/setups`, `/zh-HK/account/compare-setups`, `/zh-HK/account/study-plans`, and `/zh-HK/dashboard/analytics`: `Supporter learner`
  - Likely causes: route/page message catalogs still contain English tool/product names where localized names already exist elsewhere; start/search reuse partially localized catalog/concept titles; dev-account-harness fixture names are English and create false positives in signed-in zh-HK sweeps.
  - Fix direction: localize or deliberately allowlist product/tool names consistently. If `Circuit Builder` and `Chemistry Reaction Mind Map` are product names, document and allowlist them; otherwise use the established zh-HK names such as `電路工房` and a localized chemistry mind-map name. Localize billing plan display copy as `Open Model Lab 支持者方案` or equivalent. For start/search, ensure topic/concept/display-title helpers use zh-HK overlays before constructing CTA text. For signed-in dev sweeps, use localized harness display names or update the sweep to distinguish user-generated display names from UI copy.
  - Validation: rerun `pnpm i18n:sweep:zh-HK -- --autostart`; the eight non-concept findings above must disappear or be represented by an explicit, reviewed allowlist entry with a comment explaining why the English phrase is intentional.

  - Completion note (2026-05-29 HKT): Localized the non-concept zh-HK leaks on pricing, billing, and start/search CTAs, and documented the signed-in dev fixture-name allowlist in the sweep.
  - Validation: git diff --check; pnpm i18n:sweep:zh-HK -- --autostart; pnpm i18n:check:zh-HK; pnpm exec eslint app/billing/page.tsx components/start/StartLearningPage.tsx scripts/browser-zhhk-site-sweep.mjs; pnpm typecheck

### P1 - Hard-Coded Copy / Architecture Debt

- [x] **OML-QA-028: Move hard-coded bilingual UI copy out of route/component code into message catalogs or content overlays.**
  - Evidence: static inspection found `80` app/component/lib files using local `copyText(...)`, direct `locale === "zh-HK"` branches, `copy.locale === "zh-HK"` branches, or `isZhHk` UI string conditionals. This makes partial translation easy because strings can bypass `messages/<locale>.json`, content overlays, and key-coverage checks.
  - Highest-risk files by count include `components/tracks/StarterTrackDetailPage.tsx`, `components/guided/ConceptBundleBuilder.tsx`, `lib/progress/tracks.ts`, `components/guided/GuidedCollectionDetailPage.tsx`, `components/tracks/StarterTrackCompletionPage.tsx`, `lib/progress/entry-diagnostics.ts`, `app/billing/page.tsx`, `app/ads/page.tsx`, `app/source/page.tsx`, `components/challenges/ChallengeDiscoveryHub.tsx`, `components/circuit-builder/CircuitBuilderPage.tsx`, and many simulation files.
  - Fix direction: keep stable IDs, slugs, math tokens, units, and physics variables in code, but move user-facing labels, paragraphs, button text, aria labels, empty/error states, plan labels, page section copy, and simulation scene/readout labels into message namespaces or content overlay fields. Use typed helpers around message namespaces instead of ad hoc per-file `copyText` functions.
  - Scope guard: this is a migration task, not a single giant rewrite. Start with the files that produced browser leaks in `OML-QA-026` and `OML-QA-027`, then migrate the route/progress/guided/tracks/account surfaces. Leave low-level numeric formatting and symbolic physics expressions in code when they are not language copy.
  - Validation: add or extend a static i18n lint/audit so new visible English literals in `app`, `components`, and `lib` are either message keys, content fields, or explicitly allowlisted. The audit should fail on new route/component-visible English text that is not behind `useTranslations`, `getScopedTranslator`, content overlay resolution, or a reviewed exception.

  - Completion note (2026-05-29 HKT): Migrated the ads, billing, and source route copy from ad hoc bilingual branches into message namespaces, and added a baseline-backed static audit that fails on new visible hard-coded English/zh-HK route/component copy including JSX text children.
  - Validation: git diff --check; node --check scripts/audit-hardcoded-i18n-copy.mjs; pnpm i18n:audit:hardcoded-copy:self-test; pnpm i18n:audit:hardcoded-copy; pnpm i18n:check:zh-HK; pnpm exec eslint scripts/audit-hardcoded-i18n-copy.mjs app/ads/page.tsx app/billing/page.tsx app/source/page.tsx; pnpm typecheck

- [x] **OML-QA-029: Replace the fragile `localizeKnownSimulationText` / `localizeKnownCompareText` string switch with keyed simulation copy.**
  - Evidence: visible concept leaks include many short simulation labels such as `Live setup`, `Live`, `Energy balance`, `Mode shape`, `Driven response`, `Transient mode`, `Fixed bar length`, `Active circuit`, `Resistive load`, `graph scan line`, `principal axis`, `Result`, `theta`, `Eeff`, and `Live array`. Some labels are mapped in `lib/i18n/copy-text.ts`, but rendered pages still leak English because not every visible simulation/readout string passes through that helper.
  - Affected area: `lib/i18n/copy-text.ts`, `components/simulations/*Simulation.tsx`, `components/simulations/primitives/scene-card.tsx`, `components/simulations/primitives/compare.tsx`, `components/simulations/SimulationShell.tsx`, `components/graphs/LineGraph.tsx`, and generated/resolved concept simulation copy.
  - Fix direction: give simulation scene titles, readout labels, graph labels, overlay labels, compare labels, and badge labels stable translation keys. Prefer per-simulation message namespaces or content overlay fields over matching English strings at runtime. Remove switch cases as their callers migrate so new labels cannot silently fall through in zh-HK.
  - Validation: run a DOM text audit over all published zh-HK concept pages that extracts every visible line from the live lab, controls, readouts, graph tabs, overlays, and equation panels. The audit should fail on English prose/labels while allowing math symbols, units, variable names, and reviewed product names.

  - Completion note (2026-05-29 HKT): Replaced the old known-string simulation localizers with stable keyed simulation copy, wired scene/readout/compare labels through the keyed helper, and migrated affected simulation call sites so zh-HK concept pages no longer rely on fragile English string matching for those labels.
  - Validation: git diff --check; git diff --check HEAD^..HEAD; rg localizeKnownSimulationText/localizeKnownCompareText; pnpm i18n:check:zh-HK; pnpm i18n:sweep:zh-HK -- --autostart; pnpm lint; pnpm typecheck

### P2 - Regression Coverage / Routing QA

- [ ] **OML-QA-030: Add durable browser coverage for locale switching and locale-preserving navigation.**
  - Evidence: an ad hoc Playwright check on 2026-05-29 passed the routing behavior: switching `/en` to zh-HK landed on `/zh-HK`; switching `/en/concepts/simple-harmonic-motion?mode=challenge#quick-test` landed on `/zh-HK/concepts/simple-harmonic-motion?mode=challenge#quick-test`; switching `/zh-HK/search?q=force&subject=physics#search-results` back to English preserved path, query, and hash. A 36-route zh-HK anchor audit found `0` internal anchor hrefs dropping the locale, and sampled CTA/link clicks from home, concepts, start, search, pricing, and SHM produced `0` locale-drop failures.
  - Risk: existing unit coverage for `LocaleSwitcher` passes, but the routing behavior was not captured as a durable browser test, so future custom links or router calls can regress silently.
  - Fix direction: add a Playwright spec that covers language switching from representative public/concept/search routes, then sweeps visible internal anchors on zh-HK routes and clicks representative CTAs/buttons to ensure the resulting URL stays under the selected locale unless the control is explicitly switching language or leaving the site.
  - Validation: new spec should run in the focused i18n suite and in the release/QA sweep. It should explicitly preserve query strings and hashes, and it should ignore `mailto:`, external URLs, static files, API routes, and same-page hash anchors correctly.

- [ ] **OML-QA-031: Strengthen zh-HK browser sweep reporting so it finds every leak, not only the first leak per route.**
  - Evidence: `scripts/browser-zhhk-site-sweep.mjs` currently records the first English-leak line found on each route. The 2026-05-29 run produced `105` route-level findings, but many affected pages likely contain multiple English strings after the first one.
  - Fix direction: change the sweep to collect all suspicious visible English lines per route with enough DOM context to locate them. Include route, sample text, nearest heading or landmark, element role/tag, and a capped list of text snippets. Keep the existing route-level summary, but write a detailed artifact for implementation.
  - Validation: rerun `pnpm i18n:sweep:zh-HK -- --autostart`; when leaks exist, the JSON artifact should group them by route and by likely source category (`message`, `content overlay fallback`, `simulation hard-code`, `user fixture`, `allowed product name`). When leaks are fixed, the artifact should show zero unapproved issues and the script should exit 0.
