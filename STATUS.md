# Open Model Lab Status

## 2026-06-01 OML-QA-072 Circuit Builder Guided Build Checks

Current state: `OML-QA-072` is complete. Circuit Builder now includes a compact guided mode with bounded build/check goals, starter-load actions, solver-backed circuit checks, and success/incomplete/wrong-placement feedback so the tool teaches a small task loop instead of only exposing free-build editor controls.

Implementation commits: `e4364a8` and `1726dea`.

### Files Changed

- `components/circuit-builder/CircuitBuilderGuide.tsx`: adds the guided-mode panel with selectable goals, starter/check/explain actions, result feedback, and measurement/explanation details.
- `components/circuit-builder/CircuitBuilderPage.tsx`: wires the active guided goal, starter circuit loads, check results, progress events, and the guide panel into the workbench layout.
- `lib/circuit-builder/challenges.ts` and `lib/circuit-builder/index.ts`: add the guided challenge model and solver-backed checks for the bounded circuit goals.
- `tests/components/circuit-builder-page.test.tsx`: covers guided goal success, incomplete-circuit hints, and wrong-placement feedback.
- `tests/e2e/circuit-builder.spec.ts`: covers the guided build/check flow, desktop/mobile guide screenshots, and the repaired builder-row regression gate.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check 63a154f..HEAD`: passed.
- `pnpm exec eslint components/circuit-builder/CircuitBuilderGuide.tsx components/circuit-builder/CircuitBuilderPage.tsx lib/circuit-builder/challenges.ts tests/components/circuit-builder-page.test.tsx tests/e2e/circuit-builder.spec.ts`: passed.
- `pnpm exec vitest run tests/components/circuit-builder-page.test.tsx --reporter=dot`: passed, 71/71.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts --grep "guides build checks|keeps the builder row visible" --reporter=line`: passed, 2/2.
- `pnpm typecheck`: passed.
- Screenshot inspection: desktop and phone guided-mode screenshots show the guide is compact enough to keep the workbench path visible while preserving the free-build workspace.

Residual risk: the guided mode adds another first-viewport band on phone, so future Circuit Builder feature additions should keep the mobile guide concise and avoid pushing the workspace controls below the initial screen.

## 2026-06-01 OML-QA-071 Circuit Builder Account Save Discovery

Current state: `OML-QA-071` is complete. Circuit Builder now surfaces a compact save-state affordance in the workspace controls, with distinct signed-out, signed-in free, and Supporter states visible in the first phone and desktop viewport after loading a circuit. Supporter users get a visible `Save to account` action, while signed-out and free users keep local save primary with account-save guidance.

### Files Changed

- `components/circuit-builder/CircuitBuilderPage.tsx`: wraps the save-state affordance on phone and places it before render-mode controls.
- `components/circuit-builder/CircuitWorkspace.tsx`: renders workspace control slots before the dense workspace status pill.
- `tests/e2e/circuit-builder.spec.ts`: asserts the save-state affordance is measurable and fits inside the first viewport for signed-out, free, and Supporter states.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/circuit-builder/CircuitBuilderPage.tsx components/circuit-builder/CircuitWorkspace.tsx tests/e2e/circuit-builder.spec.ts`: passed.
- `pnpm exec vitest run tests/components/circuit-builder-account-saves.test.tsx --reporter=dot`: passed, 3/3.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts --grep "surfaces distinct save-state affordances|saves and reopens an account-backed circuit" --reporter=line`: passed, 2/2.
- `pnpm typecheck`: passed.
- Screenshot inspection: signed-out, free, and Supporter phone/desktop screenshots show distinct save-state UI in the first viewport.

Residual risk: the mobile preset strip can still open horizontally scrolled after choosing a later preset, clipping the preceding preset label. That is separate from save-state discovery and remains a candidate for a later Circuit Builder layout task.

## 2026-06-01 OML-QA-070 Circuit Builder Mobile Add Parts Order

Current state: `OML-QA-070` is complete. On mobile, the Circuit Builder now puts the `Add parts` and `Inspector` disclosures directly below the workspace and before Environment, status, save, and export tools, so a new learner can reach the component search/add path before dense tool chrome.

### Files Changed

- `components/circuit-builder/CircuitBuilderPage.tsx`: moves the mobile palette and inspector path under the workspace and before Environment/status/tool panels.
- `lib/circuit-builder/copy.ts`: renames the mobile component-library disclosure to `Add parts` in English and zh-HK and updates its summary copy.
- `tests/e2e/circuit-builder.spec.ts`: asserts the mobile add/search path appears before Environment, status, and export controls while keeping inspector, save, and connection flows reachable.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/circuit-builder/CircuitBuilderPage.tsx lib/circuit-builder/copy.ts tests/e2e/circuit-builder.spec.ts`: passed.
- `pnpm exec vitest run tests/components/circuit-builder-page.test.tsx --reporter=dot`: passed, 70/70.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "keeps the component library" --reporter=line`: passed, 1/1.
- `pnpm typecheck`: passed.
- Screenshot inspection: `output/playwright/qa/oml-qa-070-phone-empty-add-parts-order.png` shows the mobile workspace followed by the Add parts path before Environment/status tools.

Residual risk: the component search itself can still sit just below the first 844px viewport after the workspace and empty-state card, but the ordering gate now prevents save/export/history controls from coming before the add-parts path.

## 2026-06-01 OML-QA-069 Circuit Builder Touch Targets

Current state: `OML-QA-069` is complete. Circuit Builder starter presets, render-mode controls, workspace controls, and toolbar menu triggers/actions now present at least 44px visible targets across the audited phone, tablet, desktop, and wide viewports, with focus-visible rings on the compact controls.

Implementation commit: `8e976d0`.

### Files Changed

- `components/circuit-builder/CircuitBuilderPage.tsx`: raises preset chips, render-mode options, and toolbar button styles to 44px targets with focus-visible rings.
- `components/circuit-builder/CircuitWorkspace.tsx`: raises workspace zoom, fit, reset, and clear controls to 44px targets.
- `components/circuit-builder/CircuitToolbarMenu.tsx`: raises toolbar menu triggers to 44px targets.
- `tests/e2e/circuit-builder.spec.ts`: adds a cross-locale phone/tablet/desktop/wide primary target-size audit and keeps the narrower laptop toolbar compactness gate.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check 8e976d0^..8e976d0`: passed for implementation commit `8e976d0`.
- `git diff --check`: passed.
- `pnpm exec eslint components/circuit-builder/CircuitBuilderPage.tsx components/circuit-builder/CircuitWorkspace.tsx components/circuit-builder/CircuitToolbarMenu.tsx tests/e2e/circuit-builder.spec.ts`: passed.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "primary touch targets|toolbar groups compact" --reporter=line`: passed, 2/2.
- `pnpm typecheck`: passed.

Residual risk: the 44px toolbar targets intentionally make dense toolbar rows taller. The new 1180px compactness gate covers the current row, but future toolbar additions may need secondary grouping to avoid crowding.

## 2026-06-01 OML-QA-068 Circuit Builder Preset Fit

Current state: `OML-QA-068` is complete. Circuit Builder preset loads and JSON imports now compute their initial view from the active workspace frame, so phone, tablet, desktop, and wide viewports open starter circuits fully inside the visible stage instead of clipping the loop or leaving it tiny.

Implementation commit: `4a159f7`.

### Files Changed

- `components/circuit-builder/CircuitBuilderPage.tsx`: applies responsive fitted views when loading presets, loading JSON documents, fitting the workspace, and centering zoom/add-component interactions.
- `components/circuit-builder/CircuitWorkspace.tsx`: uses the active circuit canvas frame for SVG viewBox sizing and pointer/wheel coordinate mapping.
- `lib/circuit-builder/view.ts` and `lib/circuit-builder/index.ts`: add shared workspace frame constants and fitted-view calculation.
- `tests/e2e/circuit-builder.spec.ts`: adds starter-preset fit coverage across phone, tablet, desktop, and wide viewports.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check 4a159f7^..4a159f7`: passed for implementation commit `4a159f7`.
- `git diff --check`: passed.
- `pnpm exec eslint components/circuit-builder/CircuitBuilderPage.tsx components/circuit-builder/CircuitWorkspace.tsx lib/circuit-builder/view.ts tests/e2e/circuit-builder.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "fits starter presets inside the visible workspace" --reporter=line`: passed, 1/1.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "fits small circuits large enough" --reporter=line`: passed, 1/1.

Residual risk: the fitted-view bounds use a shared component/readout padding estimate rather than per-component geometry. The new E2E gate covers the current starter presets across the target viewports; future unusually large component labels may still need a geometry-aware fit refinement.

## 2026-06-01 OML-QA-067 Circuit Builder Empty Workspace Instruction

Current state: `OML-QA-067` is complete. The empty Circuit Builder workspace now uses a dark-stage-native instruction card with readable title/body/example copy and an `Open parts` action that focuses the component library, replacing the previous pale SVG card that was low-contrast on the dark canvas.

Implementation commit: `33b53fe`.

### Files Changed

- `components/circuit-builder/CircuitWorkspace.tsx`: renders the empty-state instruction as HTML over the workspace stage and wires the component-library action.
- `components/circuit-builder/CircuitBuilderPage.tsx` and `components/circuit-builder/CircuitPalette.tsx`: open and focus the component library from the empty-state action.
- `app/globals.css`: adds dark-stage empty-card contrast and action styling.
- `lib/circuit-builder/copy.ts`: adds localized empty-state action copy.
- `tests/e2e/circuit-builder.spec.ts`: adds phone/tablet/desktop/wide contrast, font-size, screenshot, and focus coverage.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed for implementation commit `33b53fe`.
- `git diff --check`: passed.
- `pnpm exec eslint components/circuit-builder/CircuitWorkspace.tsx components/circuit-builder/CircuitPalette.tsx components/circuit-builder/CircuitBuilderPage.tsx lib/circuit-builder/copy.ts tests/e2e/circuit-builder.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/circuit-builder.spec.ts -g "empty workspace instruction" --reporter=line`: passed, 1/1.
- Screenshot inspection passed for phone, tablet, desktop, and wide artifacts under `output/playwright/test-results/circuit-builder-keeps-the--021c1-e-on-the-dark-circuit-stage-chromium/`.

Residual risk: the new action focuses the first visible palette panel using DOM visibility checks. That matches the current desktop and mobile layouts, but future palette restructuring should keep the `data-circuit-palette-panel` and `data-circuit-palette-item` hooks stable.

## 2026-06-01 OML-QA-066 Account Behaviour Sweep

Current state: `OML-QA-066` is complete. The repo now has a durable Playwright account-behaviour sweep covering account, dashboard, analytics, saved-library, compare-library, and study-plan account surfaces across signed-out, free, and Supporter states where applicable. The sweep runs in English and zh-HK over phone, tablet, and desktop viewports, checking horizontal overflow, obvious text clipping, usable 44px primary actions, stale zh-HK English leakage, browser-guard issues, auth pending/success/error states, sync retry behavior, reward variants, and study-plan search/empty states.

### Files Changed

- `tests/e2e/account-behaviour-sweep.spec.ts`: adds the durable account-behaviour matrix and focused auth/sync/reward/study-plan state checks.
- `scripts/run-playwright-qa-sweep.mjs`: includes the account behaviour sweep in the local QA sweep runner.
- `app/account/setups/page.tsx`, `app/account/compare-setups/page.tsx`, and `app/account/study-plans/page.tsx`: raise saved-library and study-plan hero CTA hit areas to the 44px floor surfaced by the new gate.
- `components/progress/FreeTierProgressRecapPanel.tsx`: allows narrow recap headings to wrap cleanly instead of clipping.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for implementation commit `c712106`.
- `pnpm exec eslint app/account/setups/page.tsx app/account/compare-setups/page.tsx app/account/study-plans/page.tsx components/progress/FreeTierProgressRecapPanel.tsx scripts/run-playwright-qa-sweep.mjs tests/e2e/account-behaviour-sweep.spec.ts`: passed.
- `pnpm exec playwright test --config=playwright.config.ts tests/e2e/account-behaviour-sweep.spec.ts`: passed, 3/3.
- `pnpm test:e2e:qa-sweep tests/e2e/account-behaviour-sweep.spec.ts --port=3200`: passed with `ok: true` and `hasInstability: false`.
- `pnpm typecheck`: passed.

Residual risk: the new sweep is intentionally lightweight and catches visible layout/state regressions rather than proving every account business rule. It should stay as a release-gate smoke layer above the more targeted account specs.

## 2026-05-31 OML-QA-065 Account Achievement Preview

Current state: `OML-QA-065` is complete. Signed-in free and Supporter account pages now show a compact achievement preview before the longer account overview cards, with the next badge target, one-time reward-route progress, earned badge count, and a direct jump to the full badges/rewards section. The full named badge groups remain collapsed by default and now include badge search plus earned/locked filters.

### Files Changed

- `components/account/AccountPagePanel.tsx`: loads the achievement overview once for signed-in account pages and renders the compact preview near the top of the account surface.
- `components/account/AchievementsSection.tsx`: accepts a shared achievement overview state, keeps long named badge lists collapsed, and adds search plus earned/locked/all filters.
- `messages/en.json` and `messages/zh-HK.json`: localize the compact account achievement preview and badge-list search/filter controls.
- `tests/components/account-page-panel.test.tsx` and `tests/components/achievements-section.test.tsx`: cover the overview preview, earned count, reward status, search, filtering, and collapsed long-list behavior.
- `tests/e2e/account-achievements.spec.ts`: verifies preview visibility for free/Supporter account states, preserves reward-state coverage, checks named badge controls, and captures phone/desktop QA screenshots.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec vitest run tests/components/achievements-section.test.tsx tests/components/account-page-panel.test.tsx --reporter=dot`: passed, 42/42.
- `pnpm exec playwright test tests/e2e/account-achievements.spec.ts --reporter=line`: passed, 11/11.
- `pnpm lint -- components/account/AchievementsSection.tsx components/account/AccountPagePanel.tsx tests/components/achievements-section.test.tsx tests/components/account-page-panel.test.tsx tests/e2e/account-achievements.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `git diff --check`: passed.
- Screenshot artifacts: `output/playwright/qa/oml-qa-065-signed-in-free-phone.png`, `output/playwright/qa/oml-qa-065-signed-in-free-desktop.png`, `output/playwright/qa/oml-qa-065-signed-in-premium-phone.png`, and `output/playwright/qa/oml-qa-065-signed-in-premium-desktop.png`.

Residual risk: the compact preview picks the next milestone by the highest current progress ratio. That keeps the card useful with today’s milestone catalog, but a future product-specific badge priority order may need an explicit ranking if motivation goals change.

## 2026-05-31 OML-QA-064 Study Plan Picker

Current state: `OML-QA-064` is complete. The Supporter `/account/study-plans` builder now uses a searchable catalog picker with type, subject, topic, and progress filters instead of the long native catalog select. Selected item and selected route previews make concept, track, guided collection, and goal-path entries understandable on phone and desktop, with keyboard-reachable choose, reorder, and remove controls.

### Files Changed

- `components/account/SavedStudyPlansPage.tsx`: adds searchable/filterable catalog controls, progress-aware recent/recommended filtering, selected-item preview, and compact selected-route preview with accessible move/remove controls.
- `components/account/saved-study-plan-display.ts`: enriches catalog options with subject/topic facets, concept coverage, estimated minutes, and search text.
- `messages/en.json` and `messages/zh-HK.json`: localize picker filters, result states, selected previews, route summaries, and accessible control labels.
- `tests/components/saved-study-plans-page.test.tsx`: covers zh-HK rendering plus search/type/subject/topic/progress filters and route reorder/remove behavior.
- `tests/e2e/account-study-plan-picker.spec.ts`: builds desktop and phone study plans through the picker, saves them, verifies the dashboard preview, and captures QA screenshots.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec vitest run tests/components/saved-study-plans-page.test.tsx tests/components/account-dashboard-panel.test.tsx tests/app/dashboard-page.test.tsx --reporter=dot`: passed, 24/24.
- `pnpm exec eslint components/account/SavedStudyPlansPage.tsx components/account/saved-study-plan-display.ts tests/components/saved-study-plans-page.test.tsx tests/e2e/account-study-plan-picker.spec.ts`: passed.
- `pnpm exec playwright test tests/e2e/account-study-plan-picker.spec.ts --reporter=line`: passed, 1/1.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm typecheck`: passed.
- `git diff --check`: passed.
- Screenshot artifacts: `output/playwright/qa/oml-qa-064-study-plans-desktop-builder.png`, `output/playwright/qa/oml-qa-064-study-plans-desktop-dashboard.png`, `output/playwright/qa/oml-qa-064-study-plans-phone-builder.png`, and `output/playwright/qa/oml-qa-064-study-plans-phone-dashboard.png`.

Residual risk: the picker infers subject/topic facets from each item's concept coverage. That is enough for current concepts, tracks, guided collections, and goal paths, but future non-concept catalog surfaces may need explicit facets if they should appear under subject/topic filters.

## 2026-05-31 OML-QA-063 Saved Library Creation CTAs

Current state: `OML-QA-063` is complete. `/account/setups` no longer opens with `Open compare library`, and `/account/compare-setups` no longer opens with `Open saved setups`; both pages now put creation-path actions before the fold (`Find a live bench`, `Find a compare bench`, start, and search). Supporter empty states explain the exact source flow: save an adjusted concept bench setup, or enter Compare, set up A/B, and save the named compare scene.

### Files Changed

- `app/account/setups/page.tsx` and `app/account/compare-setups/page.tsx`: replace sibling-library hero links with live-bench, compare-bench, start, and search CTAs.
- `components/account/SavedSetupsLibraryPage.tsx`: adds the same start path to the free/locked saved-setup library actions.
- `messages/en.json` and `messages/zh-HK.json`: update saved-library hero/action and empty-state creation guidance.
- `tests/components/saved-setups-library-page.test.tsx` and `tests/components/saved-compare-setups-library-page.test.tsx`: assert the clearer empty-state instructions and saved-setup free-state start action.
- `tests/e2e/account-library-ctas.spec.ts`: covers signed-out, free, and Supporter account states for both library routes and captures phone/desktop first-viewport screenshots.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec vitest run tests/components/saved-setups-library-page.test.tsx tests/components/saved-compare-setups-library-page.test.tsx`: passed, 10/10.
- `pnpm exec eslint app/account/setups/page.tsx app/account/compare-setups/page.tsx components/account/SavedSetupsLibraryPage.tsx components/account/SavedCompareSetupsLibraryPage.tsx tests/components/saved-setups-library-page.test.tsx tests/components/saved-compare-setups-library-page.test.tsx tests/e2e/account-library-ctas.spec.ts`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm exec playwright test tests/e2e/account-library-ctas.spec.ts`: passed, 2/2.
- `pnpm typecheck`: passed.
- `git diff --check`: passed.
- Screenshot artifacts: `output/playwright/qa/oml-qa-063-saved-setups-phone.png`, `output/playwright/qa/oml-qa-063-saved-setups-desktop.png`, `output/playwright/qa/oml-qa-063-compare-setups-phone.png`, and `output/playwright/qa/oml-qa-063-compare-setups-desktop.png`.

## 2026-05-31 OML-QA-062 Dashboard And Analytics First Viewports

Current state: `OML-QA-062` is complete. Phone dashboard and analytics openings now answer the next-action question before heavier account or methodology copy: `/dashboard` starts with a compact first-move panel, premium `/dashboard/analytics` starts with a next-step analytics preview, and free locked `/dashboard/analytics` is padded correctly and leads with the free sync state plus dashboard/pricing actions.

### Files Changed

- `components/account/AccountDashboardPanel.tsx` and `app/dashboard/DashboardRoute.tsx`: add a compact dashboard first-move panel before the account overview grid and shorten the signed-in dashboard lead-in.
- `components/account/LearningAnalyticsPanel.tsx` and `app/dashboard/analytics/DashboardAnalyticsRoute.tsx`: add a premium analytics next-action/signal preview, shorten the analytics hero, and move the free locked route back into a contained padded shell.
- `messages/en.json` and `messages/zh-HK.json`: add localized first-move, locked analytics, and shorter dashboard/analytics hero copy.
- `tests/e2e/dashboard-first-viewport.spec.ts`: verifies signed-in free and premium phone `/dashboard` and `/dashboard/analytics` first viewports, no left-edge clipping, no horizontal overflow, and writes QA screenshots.
- Existing route/component/E2E tests were updated for the new first-action copy and current signed-out account smoke expectation.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec vitest run tests/components/account-dashboard-panel.test.tsx tests/components/learning-analytics-panel.test.tsx tests/app/dashboard-page.test.tsx tests/app/dashboard-analytics-page.test.tsx --reporter=dot`: passed, 30/30.
- `pnpm exec playwright test tests/e2e/dashboard-first-viewport.spec.ts --reporter=line`: passed, 4/4.
- `pnpm exec playwright test tests/e2e/site-smoke.spec.ts --reporter=line`: passed, 6/6.
- `pnpm exec playwright test tests/e2e/premium-checkpoint-history.spec.ts --reporter=line`: passed, 1/1.
- `pnpm lint -- app/dashboard/DashboardRoute.tsx app/dashboard/analytics/DashboardAnalyticsRoute.tsx components/account/AccountDashboardPanel.tsx components/account/LearningAnalyticsPanel.tsx tests/components/account-dashboard-panel.test.tsx tests/components/learning-analytics-panel.test.tsx tests/app/dashboard-page.test.tsx tests/app/dashboard-analytics-page.test.tsx tests/e2e/dashboard-first-viewport.spec.ts tests/e2e/site-smoke.spec.ts tests/e2e/premium-checkpoint-history.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- Screenshot artifacts: `output/playwright/qa/oml-qa-062-free-dashboard-phone.png`, `output/playwright/qa/oml-qa-062-premium-dashboard-phone.png`, `output/playwright/qa/oml-qa-062-free-analytics-phone.png`, and `output/playwright/qa/oml-qa-062-premium-analytics-phone.png`.

## 2026-05-31 OML-QA-061 Section Navigation Labels And Targets

Current state: `OML-QA-061` is complete. Account, dashboard, and analytics section navigation now uses the current surface label on mobile, has explicit 46px minimum visible nav controls, and the desktop rail no longer exposes the long `Jump within...` helper copy as cramped visible text. The analytics route now provides locale messages around the analytics panel so zh-HK section-nav copy resolves consistently.

### Files Changed

- `components/layout/PageSectionNavMobile.tsx`: uses `sectionNav.mobileLabel` for the closed mobile toggle and raises toggle/group/item targets above the 44px floor.
- `components/layout/PageSectionNav.tsx`: shows the shorter surface label in the desktop rail, hides the long helper copy from the visual rail, stacks the collapse control below the label, and marks visible nav controls for DOM validation.
- `app/dashboard/analytics/DashboardAnalyticsRoute.tsx` and `components/account/LearningAnalyticsPanel.tsx`: align analytics with the account/dashboard client-provider locale path so zh-HK analytics nav labels render correctly.
- `messages/zh-HK.json`: changes the global page-section fallback from concept-specific copy to page-generic copy.
- `tests/components/page-section-frame.test.tsx` and `tests/e2e/page-section-nav.spec.ts`: cover surface-specific mobile labels, desktop rail heading behavior, minimum visible control sizes, and account/dashboard/analytics screenshots across English and zh-HK.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec vitest run tests/components/page-section-frame.test.tsx tests/components/learning-analytics-panel.test.tsx tests/app/dashboard-analytics-page.test.tsx`: passed, 16/16.
- `pnpm exec playwright test tests/e2e/page-section-nav.spec.ts --reporter=line`: passed, 1/1.
- `pnpm lint -- app/dashboard/analytics/DashboardAnalyticsRoute.tsx components/account/LearningAnalyticsPanel.tsx components/layout/PageSectionNav.tsx components/layout/PageSectionNavMobile.tsx tests/components/page-section-frame.test.tsx tests/components/learning-analytics-panel.test.tsx tests/app/dashboard-analytics-page.test.tsx tests/e2e/page-section-nav.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `git diff --check`: passed.
- Screenshot artifacts: `output/playwright/qa/oml-qa-061-{en,zh-HK}-{account,dashboard,analytics}-{phone,tablet,desktop,wide}.png`.

## 2026-05-31 OML-QA-060 Signed-Out Account First Viewport

Current state: `OML-QA-060` is complete. The signed-out account page now starts with a compact account-task chooser and an immediately usable `Create account / email link` form, with password sign-in and reset as sibling task cards. Local-first sync and Supporter policy copy now sits below the forms instead of occupying the first viewport.

### Files Changed

- `components/account/AccountPagePanel.tsx`: reorders the signed-out account surface around task-shaped auth cards and moves explanatory local-first content below the forms.
- `messages/en.json` and `messages/zh-HK.json`: add concise task chooser, create-account/email-link, password sign-in, reset, and below-form explanation copy.
- `tests/components/account-page-panel.test.tsx`: covers the signed-out task-first layout, zh-HK task copy, auth validation, pending, success, cooldown, and failure states.
- `tests/e2e/account-auth.spec.ts`: asserts the phone first viewport contains the email-link field and primary action, verifies desktop shows all three auth paths, and captures QA screenshots.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec vitest run tests/components/account-page-panel.test.tsx --reporter=dot`: passed, 30/30.
- `pnpm exec playwright test tests/e2e/account-auth.spec.ts --reporter=line`: passed, 9/9.
- `pnpm lint -- components/account/AccountPagePanel.tsx tests/components/account-page-panel.test.tsx tests/e2e/account-auth.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `git diff --check`: passed.
- Screenshot inspection passed for `output/playwright/qa/oml-qa-060-account-first-viewport-phone.png` and `output/playwright/qa/oml-qa-060-account-first-viewport-desktop.png`.

## 2026-05-31 OML-QA-059 Signed-In Account Hero

Current state: `OML-QA-059` is complete. The account route now chooses signed-out, signed-in free, or signed-in Supporter lead-in copy from the preloaded account session, so signed-in learners no longer land on a hero that reads like a sign-in invitation.

### Files Changed

- `app/account/AccountRoute.tsx`: resolves the account lead-in state from the preloaded session and renders state-specific route copy.
- `messages/en.json` and `messages/zh-HK.json`: add localized signed-in free and signed-in Supporter account hero copy.
- `tests/app/account-page.test.tsx`: adds route coverage for signed-in free lead-in and zh-HK Supporter lead-in.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec vitest run tests/app/account-page.test.tsx --reporter=dot`: passed, 3/3.
- `pnpm lint -- app/account/AccountRoute.tsx tests/app/account-page.test.tsx`: passed.
- `pnpm typecheck`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `git diff --check`: passed.
- Screenshot artifact check passed for 24 account-hero images under `output/oml-qa-059/account-hero/`, including phone and wide signed-out/signed-in states.

## 2026-05-31 OML-QA-058 Premium Checkpoint History IA

Current state: `OML-QA-058` is complete. Premium checkpoint history now uses one stable visible/accessibility contract across dashboard and analytics: `Checkpoint history and mastery trends`. The dashboard slice links into the full analytics route with `Open full analytics view`, and the E2E gate now verifies synced checkpoint events, mastery timeline data, stable/pressure sections, and responsive screenshots instead of depending on stale copy.

### Files Changed

- `components/account/PremiumCheckpointHistoryPanel.tsx`: uses the stable checkpoint-history heading for dashboard and analytics variants and adds `aria-labelledby` landmarks for recent moves, timeline, subject trend, and concept pressure sections.
- `messages/en.json` and `messages/zh-HK.json`: align account/dashboard/analytics navigation labels and CTA copy around the shared checkpoint-history contract.
- `tests/components/account-dashboard-panel.test.tsx`, `tests/components/learning-analytics-panel.test.tsx`, and `tests/components/premium-checkpoint-history-panel.test.tsx`: update component assertions for the current IA.
- `tests/e2e/premium-checkpoint-history.spec.ts`: verifies the synced dashboard slice, clicks through to `/dashboard/analytics#checkpoint-history`, checks analytics sections, and captures desktop/phone QA screenshots.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `node scripts/run-vitest.mjs run tests/components/premium-checkpoint-history-panel.test.tsx tests/components/learning-analytics-panel.test.tsx tests/components/account-dashboard-panel.test.tsx`: passed, 16/16.
- `pnpm lint -- components/account/PremiumCheckpointHistoryPanel.tsx tests/e2e/premium-checkpoint-history.spec.ts tests/components/premium-checkpoint-history-panel.test.tsx tests/components/learning-analytics-panel.test.tsx tests/components/account-dashboard-panel.test.tsx`: passed.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/premium-checkpoint-history.spec.ts --reporter=line`: passed, 1/1.
- `git diff --check`: passed.
- Screenshot inspection passed for `output/playwright/qa/oml-qa-058-dashboard-checkpoint-history-desktop.png` and `output/playwright/qa/oml-qa-058-dashboard-checkpoint-history-phone.png`.

## 2026-05-31 OML-QA-057 Signed-Out Auth Regression Lane

Current state: `OML-QA-057` is complete. Signed-out auth forms now submit from the form DOM instead of controlled input state, so early-filled email/password values survive hydration timing and the email-link/reset actions no longer appear inert after a valid email is entered. Wrong-password, failed request, and unreadable response failures now clear pending state and surface visible retryable errors.

### Files Changed

- `components/account/AccountPagePanel.tsx`: reads submitted auth values from `FormData`, keeps retryable wrong-password/request failures visible, and keeps email-link/reset submit buttons actionable while still respecting pending, cooldown, and dev-harness disabled states.
- `lib/account/client.ts`: makes account session POST failures and unreadable JSON responses return structured retryable errors instead of leaving actions pending.
- `tests/e2e/account-auth.spec.ts`: strengthens signed-out auth coverage for enabled actions, pending status, success/failure notices, wrong-password retry, and mobile long-email layout.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `pnpm exec playwright test tests/e2e/account-auth.spec.ts --reporter=line`: passed, 9/9.
- `pnpm exec playwright test tests/e2e/account-auth.spec.ts tests/e2e/account-achievements.spec.ts tests/e2e/account-mobile-shell.spec.ts tests/e2e/assessment-synced-progress.spec.ts tests/e2e/premium-checkpoint-history.spec.ts --reporter=line`: passed 21/22; the remaining failure is `tests/e2e/premium-checkpoint-history.spec.ts` looking for stale heading `Cross-device checkpoint history and mastery`, already tracked as `OML-QA-058`.
- `pnpm exec eslint components/account/AccountPagePanel.tsx lib/account/client.ts tests/e2e/account-auth.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `git diff --check`: passed.

## 2026-05-31 OML-QA-056 Per-Concept Drain Protocol

Current state: `OML-QA-056` is complete. The SHM pilot has been turned into an explicit first batch of per-concept drain work: Kirchhoff rules and de Broglie matter waves now have authored concept-page V2 protocols, Beats and Air Columns start with focused inline checks, and the high-risk slug batch has a durable content assertion plus a focused concept quality matrix gate.

### Files Changed

- `content/concepts/kirchhoff-loop-and-junction-rules.json` and `content/concepts/de-broglie-matter-waves.json`: add authored V2 lesson paths, first-step checks, equation snapshots, wrap-up, and secondary reference paths.
- `content/concepts/beats.json` and `content/concepts/resonance-air-columns-open-closed-pipes.json`: strengthen first-step inline checks.
- `content/i18n/zh-HK/concepts/*`, `content/i18n/zh-HK/manifest.json`, and `content/i18n/generated/zh-HK.json`: update matching zh-HK overlays and generated i18n bundle.
- `tests/content/concept-page-v2.test.ts`: adds the OML-QA-056 high-risk drain batch assertion.
- `components/simulations/ControlPanel.tsx` and `tests/e2e/concept-quality-matrix.spec.ts`: mark the intentional controls scroller so the clipping audit does not classify expected scroll as visible clipping.
- `content/_meta/generated/concept-variant-manifest.json`: refreshed generated content variant manifest.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm validate:content`: passed.
- `pnpm exec vitest run tests/content/concept-page-v2.test.ts`: passed, 10/10.
- `pnpm i18n:validate -- --locale zh-HK`: passed with `valid: true`.
- `pnpm content:doctor`: passed with no findings.
- Targeted `pnpm exec eslint` on touched TS/TSX test files: passed.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3566 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-056-orchestrator pnpm concepts:qa-matrix --slug=beats,resonance-air-columns-open-closed-pipes,kirchhoff-loop-and-junction-rules,de-broglie-matter-waves --fail-on-unpassed -- --project=chromium`: passed, 4/4 concepts.
- Before/after evidence is in `output/oml-qa-056/`.

## 2026-05-31 OML-QA-055 Concept User Flow Coverage

Current state: `OML-QA-055` is complete. A durable representative Playwright gate now covers concept-page header/menu/help/theme/language flows, signed-out and signed-in shell variants, guided step navigation, graph tab switching, compare setup editing/reset/exit, simulation reset, quick-check answering, route reload/loading fallback, and invalid concept slug not-found behavior across phone, tablet, and desktop. The patch also prevents guided graph auto-selection from overriding a learner's manual graph-tab choice.

### Files Changed

- `tests/e2e/concept-page-user-flow.spec.ts`: adds the representative OML-QA-055 concept-page user-flow coverage.
- `components/simulations/ConceptSimulationRenderer.tsx`: keeps manual graph-tab selection stable after the guided graph is auto-selected once for the current step.
- `playwright.concept-v2.config.ts` and `scripts/run-playwright-qa-sweep.mjs`: include the new spec in the concept V2 and QA sweep gates.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed.
- Targeted `pnpm exec eslint` on touched TS/TSX/config/script files: passed.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3555 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-055-orchestrator pnpm exec playwright test tests/e2e/concept-page-user-flow.spec.ts --config=playwright.config.ts --reporter=line`: passed, 3/3.
- `pnpm test:e2e:qa-sweep -- tests/e2e/concept-page-user-flow.spec.ts --chunk-size=1 --port=3560`: passed with `ok: true`, no test failures, and no instability matches.
- Independent QA logs are under `output/qa-oml-qa-055-orchestrator/`.

## 2026-05-31 OML-QA-054 Compact Concept-Machine Openings

Current state: `OML-QA-054` is complete. Dense concept first views now keep the opening focused on the live model, current cue, and first control by suppressing secondary live-bench prose, keeping Step tools closed until requested, tightening current-step cue compaction, and moving Maxwell secondary notes to accessible-only text.

### Files Changed

- `app/globals.css`: hides secondary scene/graph prose in focus-stage openings and suppresses dense SVG scene text on touch/tablet first views.
- `components/concepts/ConceptPageV2Panels.tsx`: tightens current-step cue compaction and avoids dangling phrase/operator fragments.
- `components/simulations/ConceptSimulationRenderer.tsx`: keeps Step tools collapsed until opened or an active tool is selected.
- `components/simulations/MaxwellEquationsSynthesisSimulation.tsx`: moves secondary explanatory notes out of visible first-view density while preserving accessible text.
- `tests/components/concept-page-v2-panels.test.tsx`: adds current-step cue regression cases for dense/action-fragment examples.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- Targeted `pnpm exec eslint` on touched TS/TSX files: passed.
- `pnpm exec vitest run tests/components/concept-page-v2-panels.test.tsx tests/components/maxwell-equations-synthesis-simulation.test.tsx`: passed, 38/38.
- `OML_QA_BASE_URL=http://127.0.0.1:3454 node output/qa-oml-qa-054-repair/audit-current-step-actions.mjs`: passed with `42` cases, `0` density/surface/action failures, and max first-viewport words of `79` phone, `149` tablet, `225` desktop, `258` wide.
- `pnpm typecheck`: passed.
- Fresh screenshots inspected under `output/qa-oml-qa-054-repair/orchestrator-independent-screenshots/`.

## 2026-05-31 OML-QA-053 First Interaction Affordance

Current state: `OML-QA-053` is complete. Every simulation kind now resolves to a typed first action (`playback`, `drag-probe`, `adjust-source`, `toggle-mode`, or `inspect-state`). Time-based concepts keep the real play/pause scene control, while non-time concepts render a compact in-scene affordance with stateful accessible labels that focuses the matching scene handle or primary control.

### Files Changed

- `lib/physics/simulationUi.ts`: adds first-action metadata resolution for every published simulation kind.
- `components/simulations/ConceptSimulationRenderer.tsx`: renders the non-playback first-action affordance, tracks current control/graph/overlay state in the accessible label, and focuses the best matching interaction target.
- `messages/en.json` and `messages/zh-HK.json`: add localized first-action copy and state labels.
- `tests/physics/simulation-ui.test.ts`, `tests/components/concept-simulation-renderer-compare.test.tsx`, and `tests/e2e/concept-page-v2-flow.spec.ts`: cover all-kind metadata, playback behavior, representative drag/toggle affordances, and aria-state changes.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec vitest run tests/physics/simulation-ui.test.ts tests/components/concept-simulation-renderer-compare.test.tsx`: passed, 17/17.
- `pnpm typecheck`: passed.
- `pnpm lint -- components/simulations/ConceptSimulationRenderer.tsx lib/physics/simulationUi.ts tests/physics/simulation-ui.test.ts tests/components/concept-simulation-renderer-compare.test.tsx tests/e2e/concept-page-v2-flow.spec.ts`: passed.
- `pnpm exec playwright test tests/e2e/concept-page-v2-flow.spec.ts --grep "OML-QA-053"`: passed, 1/1.

## 2026-05-31 OML-QA-052 Phone Lesson Path Overview

Current state: `OML-QA-052` is complete. The phone lesson path is now a compact overview instead of a second dense lesson: it keeps progress, the active step title, one concise action line, previous/next controls, and numeric step-map navigation, while secondary guidance, reveal details, quick checks, and next-checkpoint copy stay out of the phone rail.

### Files Changed

- `components/concepts/ConceptPageV2Panels.tsx`: compacts the phone lesson rail, shortens the phone action summary, hides dense detail sections on phone, and turns the phone step map into numeric navigation.
- `tests/components/concept-page-v2-panels.test.tsx`: updates unit expectations for the compact phone rail and step-map labels.
- `tests/e2e/concept-page-v2-flow.spec.ts`: adds the OML-QA-052 phone audit over SHM, Equivalent Resistance, Beats, Maxwell, and Photoelectric with duplicate-action and overflow checks plus screenshots.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/concepts/ConceptPageV2Panels.tsx tests/components/concept-page-v2-panels.test.tsx tests/e2e/concept-page-v2-flow.spec.ts`: passed.
- `node scripts/run-vitest.mjs run tests/components/concept-page-v2-panels.test.tsx`: passed, 26/26.
- `PLAYWRIGHT_PORT=3418 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-052-orchestrator pnpm exec playwright test tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-052" --reporter=line`: passed, 1/1.
- `pnpm typecheck`: passed.
- Screenshot inspection passed for `output/oml-qa-052-phone-lesson-path-simple-harmonic-motion.png`, `output/oml-qa-052-phone-lesson-path-equivalent-resistance.png`, `output/oml-qa-052-phone-lesson-path-beats.png`, `output/oml-qa-052-phone-lesson-path-maxwells-equations-synthesis.png`, and `output/oml-qa-052-phone-lesson-path-photoelectric-effect.png`.

## 2026-05-31 OML-QA-051 Mobile Graph And Formula Wrapping

Current state: `OML-QA-051` is complete. Mobile graph tabs now use an intentional horizontal scroller while long labels wrap inside the tab, reveal chips can wrap instead of clipping, and equation snapshot formulas/text use responsive wrapping or formula-level horizontal scrolling. The durable Playwright gate now waits for the live bench to finish loading before auditing and capturing screenshots, so the phone evidence covers the loaded graph/formula surfaces rather than skeleton states.

### Files Changed

- `app/globals.css`: adds mobile-safe KaTeX/formula wrapping behavior.
- `components/graphs/GraphTabs.tsx`: makes phone graph tabs scroll intentionally and wraps long graph labels/axis labels inside stable tab widths.
- `components/concepts/ConceptPageV2Panels.tsx`: lets reveal chips and equation snapshot labels/read-aloud/meaning text wrap cleanly on narrow screens while keeping formulas horizontally scrollable.
- `tests/components/graph-tabs.test.tsx`, `tests/components/concept-page-v2-panels.test.tsx`, and `tests/e2e/concept-page-v2-flow.spec.ts`: add durable coverage for the wrapping behavior and the all-concept phone OML-QA-051 audit.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check 09006f9..HEAD`: passed.
- `pnpm exec eslint` on touched TS/TSX files: passed.
- `pnpm exec vitest run tests/components/graph-tabs.test.tsx tests/components/concept-page-v2-panels.test.tsx tests/components/mathFormula.test.tsx`: passed, 35/35.
- `PLAYWRIGHT_PORT=3412 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-051-orchestrator-final pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-051" --reporter=line`: passed, 1/1 over the all-concept phone audit.
- `pnpm typecheck`: passed.
- Screenshot inspection passed for the OML-QA-051 loaded contact sheet and a representative final Playwright screenshot; artifacts are under `output/qa-oml-qa-051-orchestrator/` and `output/playwright/concept-v2-results/`.

## 2026-05-31 OML-QA-050 Current-Step Cue Clipping

Current state: `OML-QA-050` is complete. The current-step cue goal and action text now wrap instead of relying on line clamps, and the compacting helper avoids dangling English phrase endings and uses CJK-aware breakpoints for zh-HK copy. The regression gate audits unclipped cue goal/action text across representative long-copy concepts in English and zh-HK at phone, tablet, desktop, and wide viewports.

### Files Changed

- `components/concepts/ConceptPageV2Panels.tsx`: removes cue line clamps and strengthens English/CJK compact current-step text heuristics.
- `tests/e2e/concept-page-v2-flow.spec.ts`: adds the OML-QA-050 responsive locale route audit for current-step cue clipping.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/concepts/ConceptPageV2Panels.tsx tests/e2e/concept-page-v2-flow.spec.ts`: passed.
- `pnpm exec vitest run tests/components/concept-page-v2-panels.test.tsx`: passed, 26/26.
- `PLAYWRIGHT_PORT=3174 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-050-orchestrator pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-050" --reporter=line`: passed, 1/1.
- `pnpm typecheck`: passed.

## 2026-05-31 OML-QA-049 Concept Touch Target Coverage

Current state: `OML-QA-049` is complete. Tablet breadcrumb and language controls now meet the coarse-pointer 44px touch floor, and the remaining SVG scene handles in the affected concept simulations use larger invisible hit regions without changing their visible handle size. The concept quality matrix now audits anchors, header controls, SVG interactive handles, and the first 1.5 viewports for touch target regressions.

### Files Changed

- `app/globals.css`: adds the coarse-pointer `touch-target-coarse` utility for 44px touch areas.
- `components/concepts/ConceptPageFramework.tsx` and `components/layout/LocaleSwitcher.tsx`: apply touch-safe hit areas to concept breadcrumbs and the locale selector.
- `components/simulations/primitives/SimulationAxisDragSurface.tsx`: expands generic SVG axis-drag hit regions.
- `components/simulations/ElectricPotentialSimulation.tsx`, `MagneticFieldsSimulation.tsx`, `GravitationalFieldsSimulation.tsx`, `GravitationalPotentialSimulation.tsx`, `LensImagingSimulation.tsx`, `MirrorsSimulation.tsx`, `PolarCoordinatesSimulation.tsx`, `RefractionSnellsLawSimulation.tsx`, `StaticEquilibriumCentreOfMassSimulation.tsx`, and `UCMSimulation.tsx`: enlarge invisible SVG drag/tap regions for affected scene handles.
- `tests/e2e/concept-quality-matrix.spec.ts`: broadens the touch-target audit to include links, header controls, SVG elements, and the first 1.5 viewports.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint` on touched TS/TSX files: passed.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3172 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-049-orchestrator OML_QA_046_CONCURRENCY=4 pnpm concepts:qa-matrix --slug=electric-potential,magnetic-fields,gravitational-fields,gravitational-potential-energy,lens-imaging,mirrors,diffraction,double-slit-interference,wave-interference,photoelectric-effect,polar-coordinates-radius-and-angle,inverse-trig-angle-from-ratio,refraction-snells-law,total-internal-reflection,static-equilibrium-centre-of-mass,uniform-circular-motion -- --project=chromium`: passed.
- Follow-up matrix artifact assertion found `0` touch/target/small issues. The focused matrix still reports existing `visible_clipping` warnings; those remain tracked by `OML-QA-050` and `OML-QA-051`.

## 2026-05-31 OML-QA-048 zh-HK Concept Scene Text Sweep

Current state: `OML-QA-048` is complete. zh-HK concept live scenes now have a durable phone scene-only sweep over all `97` published concept routes, with explicit checks for unapproved English phrases, protected math-token corruption, and repeated filler labels. The Maxwell synthesis scene and Doppler scene copy were localized through keyed/runtime copy paths, and shared mobile readout labels now localize on zh-HK routes.

### Files Changed

- `scripts/browser-zhhk-site-sweep.mjs`: adds `--scene-only` auditing for visible text inside `[data-testid="simulation-shell-scene"]`, scene-specific English/protected-token/filler checks, scene detail artifacts, and representative phone screenshots for Maxwell, SHM, Photoelectric, and Binary Search.
- `components/simulations/MaxwellEquationsSynthesisSimulation.tsx`, `messages/en.json`, and `messages/zh-HK.json`: move Maxwell scene, readout, compare, and card copy into keyed translations while preserving math symbols.
- `components/simulations/DopplerEffectSimulation.tsx`, `components/simulations/SimulationMobileReadoutDetails.tsx`, `lib/i18n/copy-text.ts`, and `lib/i18n/zh-hk-exact-runtime-copy.tsx`: localize remaining visible Doppler scene/readout labels and shared mobile readout labels used in zh-HK scenes.
- `tests/components/maxwell-equations-synthesis-simulation.test.tsx`: keeps Maxwell rendering coverage aligned with the localized readout labels.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm i18n:sweep:zh-HK -- --scene-only --autostart`: passed with `97/97` concept scenes audited, `issueCount: 0`, `sceneEnglishLeakUnapprovedIssueCount: 0`, `sceneProtectedTokenCorruptionCount: 0`, and `sceneRepeatedFillerLabelCount: 0`.
- `pnpm exec eslint` on touched simulation, i18n, sweep, and test files: passed.
- `pnpm i18n:validate -- --locale zh-HK`: passed with `valid: true`.
- `pnpm exec vitest run tests/components/maxwell-equations-synthesis-simulation.test.tsx`: passed, 3/3.
- `pnpm typecheck`: passed.
- Manual screenshot inspection passed for `output/browser-zhhk-site-sweep-scene-screenshots/phone-zhhk-maxwell-viewport.png`, `phone-zhhk-shm-viewport.png`, `phone-zhhk-photoelectric-viewport.png`, and `phone-zhhk-binary-search-viewport.png`.

## 2026-05-31 OML-QA-047 Phone/Tablet Concept Bench Reachability

Current state: `OML-QA-047` is complete. Tall phone/tablet concept scenes and dense mobile readouts have been compacted so the current-step cue starts inside the first viewport and the first controls start within 1.5 viewports across the all-concept matrix. Maxwell now uses a compact touch-layout synthesis stage instead of stacking five full law cards before the cue.

### Files Changed

- `components/simulations/SimulationShell.tsx`: moves graph panels after controls on touch/tablet layouts so controls are reachable earlier.
- `components/simulations/SimulationMobileReadoutDetails.tsx`: carries keyed localized titles/setup labels into collapsed mobile readout summaries.
- `components/simulations/MaxwellEquationsSynthesisSimulation.tsx`: adds a compact phone/tablet synthesis layout and collapsed live readout.
- `components/simulations/AirColumnResonanceSimulation.tsx`, `BeatsSimulation.tsx`, `DopplerEffectSimulation.tsx`, `LensImagingSimulation.tsx`, `OpticalResolutionSimulation.tsx`, `SoundWavesLongitudinalSimulation.tsx`, and `WaveSpeedWavelengthSimulation.tsx`: move dense phone readouts behind compact details.
- `scripts/concept-quality-matrix-core.mjs` and `tests/e2e/concept-quality-matrix.spec.ts`: add the tablet audit viewport plus durable cue/control reachability issue codes.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed.
- `pnpm exec eslint` on touched simulation, matrix, and test files: passed.
- `pnpm test tests/components/simulation-shell.test.tsx`: passed, 7/7.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3170 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-047-orchestrator OML_QA_046_CONCURRENCY=4 pnpm concepts:qa-matrix`: passed with `97/97` concepts audited and zero `cue_after_first_viewport` or `controls_after_one_point_five_viewports` findings.
- Orchestrator screenshot/metric check passed for Maxwell, Beats, Doppler, Sound Waves, Photoelectric, and Radioactivity at the affected phone/tablet sizes; artifacts are under `output/qa-oml-qa-047-orchestrator/`.

## 2026-05-31 OML-QA-046 Concept Quality Matrix Gate

Current state: `OML-QA-046` is complete. The repo now has a durable `pnpm concepts:qa-matrix` browser audit that covers all published concept slugs, classifies each concept into the task-drain review statuses, writes stable JSON/Markdown artifacts under `output/concept-quality-matrix/`, and includes a seeded self-test so the gate proves it can fail on a regression.

### Files Changed

- `package.json`: adds `concepts:qa-matrix` and `concepts:qa-matrix:self-test` scripts.
- `scripts/concept-quality-matrix-core.mjs` and `scripts/concept-quality-matrix.mjs`: add the report classifier, strict gate helpers, Markdown renderer, seeded regression self-test, and Playwright command wrapper.
- `tests/ops/concept-quality-matrix.test.ts`: covers matrix classification, seeded strict-gate failure, Markdown status output, and representative interaction coverage accounting.
- `tests/e2e/concept-quality-matrix.spec.ts`: audits all published concepts across desktop and phone viewports for route health, h1/scene/cue/control/graph/lesson-rail presence, overflow, visible clipping, touch target gaps, localized text leaks, and representative interaction behavior.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm concepts:qa-matrix:self-test`: passed, with the seeded regression failing the strict gate as expected.
- `pnpm exec vitest run tests/ops/concept-quality-matrix.test.ts`: passed.
- `pnpm exec eslint scripts/concept-quality-matrix-core.mjs scripts/concept-quality-matrix.mjs tests/ops/concept-quality-matrix.test.ts tests/e2e/concept-quality-matrix.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3168 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-046-orchestrator OML_QA_046_CONCURRENCY=4 pnpm concepts:qa-matrix`: passed. Latest matrix artifact audited `97/97` concepts, with `7` passed, `90` needs shared fix, no unreviewed rows, and `97/97` representative interactions attempted and passed. Top current findings remain the existing follow-up queue: `126` visible clipping samples and `2` localized text leak samples.

## 2026-05-30 OML-QA-045 Phone Lesson Path Content Repair

Current state: `OML-QA-045` is complete. The SHM phone lesson path now keeps one concise action line visible under the progress bar and uses a wrapped phone step map instead of a clipped horizontal carousel.

### Files Changed

- `components/concepts/ConceptPageV2Panels.tsx`: add a phone-only current-step action strip and change the phone lesson map to a two-column grid while preserving the wider-layout horizontal rail.
- `tests/components/concept-page-v2-panels.test.tsx` and `tests/e2e/concept-page-v2-flow.spec.ts`: cover the restored phone action copy and assert the phone step map no longer has horizontal overflow.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/concepts/ConceptPageV2Panels.tsx tests/components/concept-page-v2-panels.test.tsx tests/e2e/concept-page-v2-flow.spec.ts`: passed.
- `pnpm exec vitest run tests/components/concept-page-v2-panels.test.tsx`: passed, 26/26.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3160 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-044-phone-repair pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-044" --reporter=line`: passed, 1/1.

## 2026-05-30 OML-QA-044 SHM Phone Playback And Lesson Path Patch

Current state: `OML-QA-044` is complete. The SHM pilot now has a compact in-scene play/pause control so phone users can start or stop the animation from the first live-model viewpoint, and the phone lesson-path rail no longer repeats the full detailed prompt/quick-check/next-checkpoint block below the bench.

### Files Changed

- `components/simulations/TimeControlRail.tsx`, `SimulationShell.tsx`, and `ConceptSimulationRenderer.tsx`: add the reusable compact stage playback control and dock it inside the live scene.
- `components/concepts/ConceptPageV2Panels.tsx`: simplify the phone lesson rail by leaving progress, previous/next, and the step map visible while keeping the dense detail blocks for wider layouts.
- `tests/components/simulation-shell.test.tsx`, `tests/components/concept-page-v2-panels.test.tsx`, and `tests/e2e/concept-page-v2-flow.spec.ts`: add focused coverage for the scene action slot, compact phone lesson rail, and OML-QA-044 SHM phone flow.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/simulations/TimeControlRail.tsx components/simulations/SimulationShell.tsx components/simulations/ConceptSimulationRenderer.tsx components/concepts/ConceptPageV2Panels.tsx tests/components/simulation-shell.test.tsx tests/components/concept-page-v2-panels.test.tsx tests/e2e/concept-page-v2-flow.spec.ts`: passed.
- `pnpm exec vitest run tests/components/simulation-shell.test.tsx tests/components/concept-page-v2-panels.test.tsx`: passed, 33/33.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3157 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-044-combined pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-043|OML-QA-044" --reporter=line`: passed, 2/2.

## 2026-05-30 OML-QA-043 Simple Harmonic Motion Concept Workbench Pilot

Current state: `OML-QA-043` is complete. Simple Harmonic Motion is now the pilot improved concept workbench: the first guided step is prediction-first and explicitly separates angular-frequency timing from amplitude size, the step cue/action/reveals now align with the live bench controls and graphs, and the calm secondary reference path exposes worked examples, common misconception, quick test, equations, explanation, and accessibility support.

### Files Changed

- `content/concepts/simple-harmonic-motion.json`: rewrites the first and final guided steps, aligns SHM starter tasks with the timing-vs-size workbench path, and adds worked examples / misconception / quick test to the secondary reference path.
- `content/i18n/zh-HK/concepts/simple-harmonic-motion.json`, `content/i18n/zh-HK/manifest.json`, and generated i18n artifacts: update the zh-HK overlay and hashes for the SHM pilot changes.
- `tests/e2e/concept-page-v2-flow.spec.ts`, `tests/components/concept-page-framework.test.tsx`, and `tests/content/concept-page-v2.test.ts`: update focused coverage for the new SHM first step and add the OML-QA-043 workbench-pilot assertion.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm validate:content`: passed.
- `pnpm exec vitest run tests/content/concept-page-v2.test.ts tests/components/concept-page-framework.test.tsx`: passed.
- `pnpm i18n:validate -- --locale zh-HK && pnpm i18n:check:zh-HK && pnpm content:variants:validate`: passed with zh-HK `valid: true`, locale `issueCount: 0`, and zh-HK variant `usable=97`, `stale=0`, `withFallback=0`.
- `pnpm exec eslint tests/e2e/concept-page-v2-flow.spec.ts tests/components/concept-page-framework.test.tsx tests/content/concept-page-v2.test.ts`: passed.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3150 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-043 pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-043|the first guided step is active by default on simple harmonic motion|OML-QA-017" --reporter=line`: passed, 3/3.
- Desktop and phone visual checks were captured after the live bench loaded: `output/qa-oml-qa-043-shm-desktop-loaded.png` and `output/qa-oml-qa-043-shm-phone-loaded.png`.

## 2026-05-30 OML-QA-042 Caret-Color Hydration Warnings

Current state: `OML-QA-042` is complete. The light/dark theme sweep no longer relies on a broad caret-color allowlist, and Playwright screenshot capture now preserves initial caret styling so the sweep does not inject transient `caret-color: transparent` styles that appear as hydration mismatches.

### Files Changed

- `tests/e2e/theme-contrast-sweep.spec.ts`: removes the broad `/caret-color/i` browser-guard allowlist and sets screenshot `caret: "initial"` for the sweep captures.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint tests/e2e/theme-contrast-sweep.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3148 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-042-orchestrator pnpm exec playwright test tests/e2e/theme-contrast-sweep.spec.ts --reporter=line`: passed with `routeCount: 29`, `caseCount: 62`, and `issueCount: 0`.
- `pnpm test:e2e:qa-sweep -- tests/e2e/theme-contrast-sweep.spec.ts --chunk-size=1 --port=3149`: passed with `ok: true`, `hasInstability: false`, and `hasTestFailures: false`; summary artifact: `output/playwright/qa-sweep/2026-05-30T10-31-54-273Z/summary.json`.
- Log/artifact checks found no `caret-color` or hydration mismatch findings in the QA-sweep shard log or theme sweep artifact.

## 2026-05-30 OML-QA-041 Teal CTA/Button Contrast

Current state: `OML-QA-041` is complete. Shared teal action styling now uses theme-specific accessible foreground, background, hover, border, and shadow tokens so paper and dark themes do not reuse the same low-contrast `bg-teal-500 text-white` pairing. Selected graph tabs now inherit the same semantic teal action foreground.

### Files Changed

- `app/globals.css`: adds `--teal-action-*` tokens for `paper-lab` and `dark-lab`, then routes `.cta-primary`, legacy teal action buttons, selected teal states, and teal hover states through those tokens.
- `components/graphs/GraphTabs.tsx`: uses the semantic teal action foreground for selected tab text.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/graphs/GraphTabs.tsx`: passed.
- Focused teal-action Playwright probe: passed on `/zh-HK/tracks/motion-and-circular-motion`, `/zh-HK/concepts/derivative-as-slope-local-rate-of-change`, and `/concepts/simple-harmonic-motion` in `paper-lab` and `dark-lab`; artifact `output/qa-oml-qa-041-2026-05-30/focused-teal-contrast.json` reports minimum ratios of `5.38:1` in paper mode and `6.31:1` in dark concept actions, with dark track actions at `11.48:1`.
- `PLAYWRIGHT_PORT=3147 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-041-full-sweep pnpm theme:sweep:light-dark -- --reporter=line`: passed with `routeCount: 29`, `caseCount: 62`, and `issueCount: 0`.
- `pnpm typecheck`: passed.
- The full sweep still logs the existing caret-color hydration mismatch warnings tracked by `OML-QA-042`; no teal contrast failures remained.

## 2026-05-30 OML-QA-040 Paper-Mode First-Viewport Dark Surface Leakage

Current state: `OML-QA-040` is complete. Paper mode now scopes the formerly broad dark-card override to reviewed home/concept first-viewport surfaces through explicit data seams, and the targeted paper-mode sweep reports zero dark-surface leakage on the affected home and concepts index routes in English and zh-HK.

### Files Changed

- `app/_localized/home-page.tsx`: marks the home quick-start card with an explicit paper-mode override seam.
- `components/concepts/ConceptLibraryBrowser.tsx`: marks the concept index feature recommendation card with an explicit paper-mode override seam.
- `app/globals.css`: replaces the broad paper-mode `.motion-card.bg-ink-950` override with targeted paper-mode rules for the reviewed first-viewport surfaces.
- `tests/e2e/theme-contrast-sweep.spec.ts`: extends durable coverage for home/concepts paper-mode desktop and phone cases, including `/zh-HK/concepts`.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed.
- `pnpm exec eslint app/_localized/home-page.tsx components/concepts/ConceptLibraryBrowser.tsx tests/e2e/theme-contrast-sweep.spec.ts`: passed.
- `pnpm typecheck`: passed.
- Targeted paper-mode dark-surface sweep over `/`, `/zh-HK`, `/concepts`, and `/zh-HK/concepts` at `desktop-1440x900` and `phone-390x844`: passed with `caseCount: 8` and `issueCount: 0`; artifact: `output/qa-oml-qa-040-2026-05-30/orchestrator-targeted-paper-sweep/paper-dark-surface-targeted-sweep.json`.
- Representative desktop and phone screenshots inspected; the home live preview and concept feature cards now read as coherent light-mode surfaces.
- Full `tests/e2e/theme-contrast-sweep.spec.ts` was retried and hit the existing broad-sweep dev-server restart / caret-color hydration-warning instability already tracked separately by `OML-QA-042`; no target dark-surface findings were observed in the successful targeted sweep.

## 2026-05-30 OML-QA-039 Paper-Mode CTA And Filter Contrast

Current state: `OML-QA-039` is complete. Paper mode now has explicit accessible foreground/background pairs for global primary CTAs and active filter pills, and the durable theme contrast sweep covers the affected zh-HK/account/dashboard/subjects/topics/start/tests routes at desktop and phone widths.

### Files Changed

- `app/globals.css`: adds `paper-lab` overrides for `.cta-primary` and active `.filter-option` pills so paper mode no longer reuses unreadable dark-mode pairs.
- `tests/e2e/theme-contrast-sweep.spec.ts`: adds targeted paper-mode desktop/phone coverage for the high-risk zh-HK home, start, account, dashboard, subjects, topics, and tests surfaces, with per-route theme filtering to avoid unnecessary dark-mode load.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint tests/e2e/theme-contrast-sweep.spec.ts`: passed.
- `PLAYWRIGHT_PORT=3145 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-039-orchestrator pnpm exec playwright test tests/e2e/theme-contrast-sweep.spec.ts --reporter=line`: passed with `routeCount: 28`, `caseCount: 56`, `issueCount: 0`, `paperIssueCount: 0`, and targeted CTA/filter/muted issue counts all `0`.
- Screenshot inspection passed for representative paper-mode zh-HK home, start, account, and topics surfaces.
- `pnpm typecheck`: passed.

## 2026-05-30 OML-QA-038 zh-HK Account Harness Copy

Current state: `OML-QA-038` is complete. The dev account harness now uses the message catalog for its visible copy, keeps fixture account names and protected technical tokens out of destructive translation, and is included in the signed-in free/supporter zh-HK browser sweep coverage.

### Files Changed

- `app/dev/account-harness/page.tsx` and `app/[locale]/dev/account-harness/page.tsx`: localize the harness UI through scoped messages while preserving dev-only routing/noindex behavior.
- `messages/en.json` and `messages/zh-HK.json`: add `DevAccountHarnessPage` copy for English and Traditional Chinese.
- `scripts/browser-zhhk-site-sweep.mjs`: includes `/zh-HK/dev/account-harness` in signed-in free and supporter sweep passes.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint app/dev/account-harness/page.tsx app/[locale]/dev/account-harness/page.tsx scripts/browser-zhhk-site-sweep.mjs`: passed.
- `node scripts/run-vitest.mjs run tests/app/private-route-metadata.test.ts`: passed, 3/3.
- `pnpm i18n:validate -- --locale zh-HK`: passed with `valid: true`.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0`, `englishLeakUnapprovedIssueCount: 0`, `semanticZhHkIssueCount: 0`, `signedInFreeRouteCount: 5`, and `signedInPremiumRouteCount: 9`.
- `pnpm i18n:sweep:zh-HK:semantic -- --autostart`: passed with `issueCount: 0`, `englishLeakUnapprovedIssueCount: 0`, and `semanticZhHkIssueCount: 0`.
- `pnpm typecheck`: passed.

## 2026-05-30 OML-QA-037 Deployed Release Verification

Current state: `OML-QA-037` is complete. OML now has a deploy verification flow that checks the live origin after deploy rather than trusting local gates or reachability alone. The flow exposes a public `/api/deployment` marker, verifies the expected commit, runs HTTP route health checks, opens representative live zh-HK routes in Playwright, audits semantic zh-HK quality, checks light/dark contrast, writes screenshots and JSON artifacts, and fails closed with explicit follow-up candidates when production is stale or not release-ready.

### Files Changed

- `app/api/deployment/route.ts` and `lib/deployment/buildIdentity.ts`: expose a non-secret public deployment identity marker from build/runtime environment variables.
- `scripts/verify-deployed-release.mjs`: adds the live-origin release verifier and artifact writer.
- `scripts/browser-zhhk-site-sweep.mjs` and `package.json`: add the semantic-only zh-HK sweep script and release/theme verification commands.
- `docs/deployed-release-verification.md` and `docs/launch-readiness.md`: document the build marker and post-deploy verification checklist.
- `tests/deployment/build-identity.test.ts`: covers commit/deployment marker normalization and unsafe marker rejection.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed.
- `node --check scripts/verify-deployed-release.mjs`: passed.
- `node --check scripts/browser-zhhk-site-sweep.mjs`: passed.
- `pnpm exec vitest run tests/deployment/build-identity.test.ts`: passed.
- `pnpm i18n:validate -- --locale zh-HK`: passed.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0`, `englishLeakUnapprovedIssueCount: 0`, and `semanticZhHkIssueCount: 0`.
- `pnpm i18n:sweep:zh-HK:semantic -- --autostart`: passed with `issueCount: 0` and `semanticZhHkIssueCount: 0`.
- `pnpm theme:sweep:light-dark`: passed.
- `pnpm typecheck`: passed.
- `OPEN_MODEL_LAB_RELEASE_BASE_URL=https://openmodellab.com OPEN_MODEL_LAB_EXPECTED_COMMIT=$(git rev-parse HEAD) pnpm release:verify:deployed`: failed closed as expected against current production because the live site is not serving this commit and has no `/api/deployment` marker yet; artifact `output/deployed-release-verification/2026-05-30T06-36-42-146Z/summary.json` records HTTP route health as green and lists current-production follow-ups for the stale live zh-HK/theme issues.

## 2026-05-30 OML-QA-036 zh-HK Accessibility Name Localization

Current state: `OML-QA-036` is complete. The zh-HK browser sweep now extracts visible control accessible names and `aria-describedby` descriptions for buttons, links, inputs, selects, summaries, and ARIA control roles, so accessibility-only English or mixed-language labels are covered by the semantic zh-HK gate. Quick-check answer accessible names now use localized option prefixes and localized math wording.

### Files Changed

- `components/quizzes/QuizRunnerSection.tsx`, `messages/en.json`, and `messages/zh-HK.json`: localize generated quick-check option accessible labels and zh-HK delta wording.
- `scripts/browser-zhhk-site-sweep.mjs`: includes computed control accessible names and descriptions in the zh-HK browser sweep.
- `scripts/zhhk-semantic-audit.mjs`: dedupes repeated-label clusters when one control is observed through visible text, `aria-label`, and computed accessible name sources.
- `tests/components/quick-test-section.test.tsx` and `tests/i18n/zh-hk-semantic-browser-sweep.test.ts`: cover localized quick-check accessible names, untranslated computed control names, and duplicate-source dedupe.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec eslint components/quizzes/QuizRunnerSection.tsx scripts/browser-zhhk-site-sweep.mjs scripts/zhhk-semantic-audit.mjs tests/components/quick-test-section.test.tsx tests/i18n/zh-hk-semantic-browser-sweep.test.ts`: passed.
- `pnpm exec vitest run tests/components/quick-test-section.test.tsx tests/i18n/zh-hk-semantic-browser-sweep.test.ts`: passed.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0`, `englishLeakUnapprovedIssueCount: 0`, `semanticZhHkIssueCount: 0`, `publicRouteCount: 139`, `signedInFreeRouteCount: 4`, and `signedInPremiumRouteCount: 8`.
- `pnpm typecheck`: passed.

## 2026-05-30 OML-QA-035 Light/Dark Theme Contrast Sweep

Current state: `OML-QA-035` is complete. OML now has a durable Playwright light/dark contrast sweep over representative public, concept, tool, and signed-in harness surfaces in `paper-lab` and `dark-lab`; the sweep is registered in the QA sweep runner and currently reports zero contrast/theme-leak issues across 38 route/theme/viewport cases. QA also surfaced a separate caret-color hydration warning now tracked as `OML-QA-042`.

### Files Changed

- `tests/e2e/theme-contrast-sweep.spec.ts`: adds the cross-theme Playwright audit for WCAG text contrast, SVG text contrast, icon/control contrast, paper-mode dark-surface leakage, dark-mode light-surface leakage, and first-viewport text overlap, with screenshots and JSON artifacts under `output/qa-oml-qa-035-theme-contrast-sweep/`.
- `scripts/run-playwright-qa-sweep.mjs`: includes the new theme contrast sweep in the QA sweep spec set.
- `app/globals.css`: strengthens paper-mode ink tokens, accessible teal CTA/action contrast, paper-mode live-preview/feature-card surfaces, selected filter pill contrast, and dark-mode foreground overrides.
- `components/circuit-builder/CircuitWorkspace.tsx`: routes empty-state SVG text colors through theme tokens so the circuit builder remains readable in both themes.
- Tracking: `TASKS.md`, `STATUS.md`, plus new follow-up `OML-QA-042` for caret-color hydration warnings.

### Validation Run

- `git diff --check`: passed.
- `git diff --check 0a06217^..0a06217`: passed for worker patch `0a06217`.
- `pnpm exec eslint tests/e2e/theme-contrast-sweep.spec.ts scripts/run-playwright-qa-sweep.mjs components/circuit-builder/CircuitWorkspace.tsx`: passed.
- `pnpm typecheck`: passed.
- `PLAYWRIGHT_PORT=3141 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-035-orchestrator pnpm exec playwright test tests/e2e/theme-contrast-sweep.spec.ts --reporter=line`: passed, 1/1, with artifact summary `caseCount: 38`, `issueCount: 0`, and 38 screenshots.
- `pnpm test:e2e:qa-sweep -- tests/e2e/theme-contrast-sweep.spec.ts --chunk-size=1 --port=3142`: passed with `ok: true`, `hasInstability: false`, and `hasTestFailures: false`.

## 2026-05-30 OML-QA-034 Semantic zh-HK Browser QA Gate

Current state: `OML-QA-034` is complete. The zh-HK browser sweep now includes a semantic quality layer that checks visible text, accessibility labels, document titles, placeholders, protected tokens, generic filler repeats, mixed English function words, Simplified characters, mojibake, message-key leaks, and identical label clusters, with grouped source-category details in a separate semantic artifact.

### Files Changed

- `scripts/zhhk-semantic-audit.mjs`: adds the reusable semantic zh-HK analyzer and grouped report builder for DOM fallback localizer, message catalog, content overlay, simulation copy, accessibility label, protected-token corruption, and user-fixture findings.
- `scripts/browser-zhhk-site-sweep.mjs`: feeds visible text plus accessibility metadata into the semantic analyzer and writes `output/browser-zhhk-site-sweep.semantic-details.json` beside the existing summary/detail artifacts.
- `tests/i18n/zh-hk-semantic-browser-sweep.test.ts`: adds positive failure fixtures for generic filler, mixed English function words, corrupted email/domain tokens, Simplified characters, message keys, and untranslated aria labels, plus allowlisted math/product-name cases.
- `components/graphs/GraphTabs.tsx`, `components/graphs/LineGraph.tsx`, `components/search/SearchPage.tsx`, `lib/i18n/zh-hk-exact-runtime-copy.tsx`, `messages/en.json`, `messages/zh-HK.json`, and `content/i18n/zh-HK/concepts/series-parallel-circuits.json`: repair surfaced zh-HK accessibility/runtime copy and one mojibake overlay field.
- `content/i18n/generated/zh-HK.json`, `content/i18n/zh-HK/manifest.json`, and `content/_meta/generated/concept-variant-manifest.json`: refresh generated artifacts after the overlay repair.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `node --check scripts/zhhk-semantic-audit.mjs && node --check scripts/browser-zhhk-site-sweep.mjs`: passed.
- `pnpm exec vitest run tests/i18n/zh-hk-semantic-browser-sweep.test.ts`: passed, 3/3.
- `pnpm exec eslint scripts/browser-zhhk-site-sweep.mjs scripts/zhhk-semantic-audit.mjs tests/i18n/zh-hk-semantic-browser-sweep.test.ts components/graphs/GraphTabs.tsx components/graphs/LineGraph.tsx components/search/SearchPage.tsx lib/i18n/zh-hk-exact-runtime-copy.tsx`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm content:variants:validate`: passed with zh-HK `usable=97`, `invalid=0`, `stale=0`, and `withFallback=0`.
- `pnpm typecheck`: passed.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0`, `englishLeakUnapprovedIssueCount: 0`, `semanticZhHkIssueCount: 0`, `publicRouteCount: 139`, `signedInFreeRouteCount: 4`, and `signedInPremiumRouteCount: 8`.
- Artifact inspection confirmed `output/browser-zhhk-site-sweep.semantic-details.json` has `issueCount: 0` and the expected source categories.

## 2026-05-30 OML-QA-033 zh-HK Validation And Sweep Repair

Current state: `OML-QA-033` is complete. The zh-HK validator/worklist mismatch is fixed, generated zh-HK artifacts are refreshed, and the full browser zh-HK sweep is green again after the unsafe generic `項目` localizer was removed.

### Files Changed

- `tools/i18n/common.py`: uses the same runtime editorial-overlay source as the JS content registry when resolving concept translation tasks, so Python validation and JS worklist generation agree on source hashes.
- `content/i18n/zh-HK/manifest.json`, `content/_meta/generated/concept-variant-manifest.json`, `content/_meta/generated/i18n-worklist-zh-HK.*`, `content/i18n/zh-HK/concepts/optimization-maxima-minima-and-constraints.json`: refreshed repaired zh-HK overlay/generated state.
- `lib/i18n/zh-hk-exact-runtime-copy.tsx`: adds scoped exact zh-HK runtime-copy mappings and Traditional-Chinese cleanup for dynamic concept scene/worked-example strings.
- `components/simulations/SimulationShell.tsx`, shared graph/readout/math/worked-example components, and `lib/content/concept-page-v2.ts`: route remaining dynamic labels and fallback titles through the scoped exact-copy bridge.
- `messages/zh-HK.json`: removes English `checkout` / `secret key` wording from visible account/dashboard billing warnings.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm i18n:validate --locale zh-HK`: passed with `valid: true`.
- `pnpm i18n:validate -- --locale zh-HK`: passed with `valid: true`.
- `pnpm i18n:worklist --locale zh-HK`: passed, generated worklist for 0 concepts.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm content:registry`: passed.
- `OPEN_MODEL_LAB_BASE_URL=http://127.0.0.1:3100 OPEN_MODEL_LAB_DEV_BASE_URL=http://127.0.0.1:3100 pnpm i18n:sweep:zh-HK`: passed with `issueCount: 0`, `englishLeakUnapprovedIssueCount: 0`, `publicRouteCount: 139`, `signedInFreeRouteCount: 4`, and `signedInPremiumRouteCount: 8`.
- `pnpm exec eslint components/concepts/LiveWorkedExampleSection.tsx components/concepts/MathFormula.tsx components/graphs/GraphTabs.tsx components/graphs/LineGraph.tsx components/simulations/ConceptSimulationRenderer.tsx components/simulations/SimulationReadoutCard.tsx components/simulations/SimulationReadoutSummary.tsx components/simulations/SimulationShell.tsx components/simulations/primitives/scene-card.tsx lib/i18n/zh-hk-exact-runtime-copy.tsx tools/i18n/common.py`: passed for TS/TSX files; `tools/i18n/common.py` was ignored by ESLint config.
- `python3 -m py_compile tools/i18n/common.py tools/i18n/validate_overlays.py`: passed.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-032 Unsafe zh-HK Fallback Removal

Current state: `OML-QA-032` is complete. The broad zh-HK client-side DOM text-node localizer has been removed so unresolved English appears as real QA failures instead of being rewritten into generic `項目` filler, and support mailto/domain text is protected by a focused mobile paper/dark regression gate.

### Files Changed

- `app/[locale]/layout.tsx`: stops mounting the zh-HK visible-text localizer in localized layouts.
- Removed `components/layout/ZhHkVisibleTextLocalizer.tsx` and `lib/i18n/zh-hk-visible-text.ts`.
- `tests/e2e/zhhk-visible-text-integrity.spec.ts`: adds mobile `paper-lab` and `dark-lab` checks for affected zh-HK routes, unsafe `項目` fallback fragments, and readable support mailto text.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for the worker patch.
- `pnpm lint -- 'app/[locale]/layout.tsx' tests/e2e/zhhk-visible-text-integrity.spec.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/zhhk-visible-text-integrity.spec.ts`: passed, 2/2.
- `pnpm i18n:sweep:zh-HK -- --autostart`: intentionally failed after removing the masking localizer, with `issueCount: 92`, `englishLeakUnapprovedIssueCount: 977`, and `approvedEnglishFindingCount: 504`; artifacts were written to `output/browser-zhhk-site-sweep.json` and `output/browser-zhhk-site-sweep.details.json`.
- `jq` artifact inspection found zero occurrences of `項目@`, `開啟模式項目`, repeated `項目 項目`, or the tracked mixed fallback fragments.

## 2026-05-29 OML-QA-031 zh-HK Sweep Detailed Leak Reporting

Current state: `OML-QA-031` is complete. The zh-HK browser sweep now keeps its route-level failure summary while also collecting every suspicious visible English finding per route into a detailed artifact with DOM context and likely source-category grouping.

### Files Changed

- `scripts/browser-zhhk-site-sweep.mjs`: collects all route English findings, records nearest heading/landmark, element tag/role, capped snippets, likely source category, approved product-name findings, and writes `output/browser-zhhk-site-sweep.details.json` beside the existing summary artifact.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `node --check scripts/browser-zhhk-site-sweep.mjs`: passed.
- `pnpm exec eslint scripts/browser-zhhk-site-sweep.mjs`: passed.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0`, `englishLeakUnapprovedIssueCount: 0`, and `approvedEnglishFindingCount: 510`.
- `jq` artifact inspection confirmed `output/browser-zhhk-site-sweep.details.json` includes the expected route/source-category grouping and zero unapproved issues.

## 2026-05-29 OML-QA-030 Locale Routing Browser Coverage

Current state: `OML-QA-030` is complete. Locale switching, zh-HK internal anchor preservation, and representative zh-HK CTA/link navigation now have durable Playwright coverage, and the new spec is wired into both the focused i18n suite and QA sweep.

### Files Changed

- `tests/e2e/locale-routing.spec.ts`: adds browser coverage for locale switching while preserving path/query/hash, visible zh-HK internal anchor locale preservation, and representative locale-preserving CTA/link clicks.
- `package.json`: points `pnpm test:e2e:i18n` at the new locale-routing spec.
- `scripts/run-playwright-qa-sweep.mjs`: includes the new locale-routing spec in the QA sweep set.
- `app/_localized/home-page.tsx`, `app/concepts/ConceptsRoute.tsx`, `app/concepts/[slug]/page-content.tsx`, `app/pricing/PricingRoute.tsx`, `app/search/page.tsx`, `app/start/page.tsx`, `components/concepts/ConceptPageFramework.tsx`, `components/layout/PageShell.tsx`, `components/layout/SiteFooter.tsx`: add or preserve localized route semantics used by the durable browser coverage.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for repair patch `ca7055f`.
- `pnpm exec eslint tests/e2e/locale-routing.spec.ts components/layout/SiteFooter.tsx`: passed.
- `pnpm test:e2e:i18n`: passed, 3/3.
- `pnpm test:e2e:qa-sweep tests/e2e/locale-routing.spec.ts --chunk-size=1 --port=3137`: passed, 3/3 with `hasInstability: false`.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-029 Keyed Simulation Copy

Current state: `OML-QA-029` is complete. The simulation/compare copy path no longer depends on `localizeKnownSimulationText` or `localizeKnownCompareText`; scene titles, readout labels, compare badges, and related short simulation labels now flow through stable keyed simulation copy, and the zh-HK browser sweep remains clean.

### Files Changed

- `lib/i18n/copy-text.ts`: replaces the removed known-string simulation/compare localizers with keyed simulation copy helpers.
- `components/simulations/SimulationCopyText.tsx`, `SimulationReadoutCard.tsx`, `SimulationReadoutSummary.tsx`, `components/simulations/primitives/scene-card.tsx`, `components/simulations/primitives/compare.tsx`: add keyed-copy support for shared simulation surfaces.
- `components/simulations/*Simulation.tsx`, `components/simulations/primitives/optics-axis.tsx`, `lib/physics/standingWaves.ts`: migrate affected scene/readout/compare labels to keyed copy.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for worker patch `b84e2f7`.
- `rg localizeKnownSimulationText localizeKnownCompareText`: no remaining source references outside the tracked task text and legacy audit baseline.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0` across 139 public routes, 4 signed-in free routes, and 8 signed-in premium routes.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-028 Hard-Coded Copy Audit And Route Copy Migration

Current state: `OML-QA-028` is complete. Ads, billing, and source route copy now use message namespaces instead of ad hoc bilingual `copyText`/locale branches, and the repo has a baseline-backed static audit that fails on new visible hard-coded copy in `app`, `components`, and `lib`, including JSX text children.

### Files Changed

- `app/ads/page.tsx`, `app/billing/page.tsx`, `app/source/page.tsx`: migrate route metadata, section nav, hero copy, labels, links, and body copy to `getScopedTranslator` message namespaces.
- `messages/en.json`, `messages/zh-HK.json`: add `AdsPage`, `BillingPage`, and `SourcePage` message trees.
- `scripts/audit-hardcoded-i18n-copy.mjs`, `scripts/hardcoded-i18n-copy-baseline.json`, `package.json`: add the hard-coded copy audit, self-test command, and reviewed baseline for existing legacy debt.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `node --check scripts/audit-hardcoded-i18n-copy.mjs`: passed.
- `pnpm i18n:audit:hardcoded-copy:self-test`: passed, including the JSX visible-text regression probe.
- `pnpm i18n:audit:hardcoded-copy`: passed with `newIssueCount: 0`, `staleAllowedIssueCount: 0`, `checkedFileCount: 635`.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm exec eslint scripts/audit-hardcoded-i18n-copy.mjs app/ads/page.tsx app/billing/page.tsx app/source/page.tsx`: passed.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-027 Non-Concept zh-HK Surface Leaks

Current state: `OML-QA-027` is complete. The non-concept zh-HK sweep leaks on pricing, billing, start/search CTAs, and signed-in account fixture names are resolved or explicitly treated as dev-harness user fixture data.

### Files Changed

- `messages/zh-HK.json`: localizes the pricing page tool summary as `電路工房、化學反應心智圖等學習工具`.
- `app/billing/page.tsx`: uses a localized zh-HK billing plan display name for the supporter-plan snapshot and explanatory copy.
- `components/start/StartLearningPage.tsx`: builds start-page recommendation CTA labels from localized concept, topic, track, and subject display helpers.
- `scripts/browser-zhhk-site-sweep.mjs`: documents and strips signed-in dev account harness display names from the zh-HK mixed-language audit so fixture names do not masquerade as product UI copy.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0` across 139 public routes, 4 signed-in free routes, and 8 signed-in premium routes.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm exec eslint app/billing/page.tsx components/start/StartLearningPage.tsx scripts/browser-zhhk-site-sweep.mjs`: passed.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-026 zh-HK Concept Translation Coverage

Current state: `OML-QA-026` is complete. The zh-HK concept overlay worklist now reports zero fallback fields, the overlay validator covers the current concept surfaces, and the rendered zh-HK browser sweep is clean for public and signed-in routes.

### Files Changed

- `content/i18n/zh-HK/concepts/*`: fills the remaining zh-HK concept overlay fields across published concept pages.
- `content/i18n/generated/zh-HK.json`, `content/i18n/zh-HK/manifest.json`, `content/_meta/generated/i18n-worklist-zh-HK.*`, `content/_meta/generated/concept-variant-manifest.json`: refresh generated zh-HK i18n and variant artifacts.
- `lib/content/editorial-overlays.mjs`, `tools/i18n/common.py`, `tools/i18n/validate_overlays.py`: expands overlay extraction and validation for current concept content surfaces.
- `components/layout/ZhHkVisibleTextLocalizer.tsx`, `lib/i18n/zh-hk-visible-text.ts`, `lib/i18n/copy-text.ts`, `app/[locale]/layout.tsx`: add a zh-HK visible-text guard for remaining hardcoded runtime strings while the keyed-copy migration remains tracked in `OML-QA-028` and `OML-QA-029`.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm i18n:worklist -- --locale zh-HK`: passed, generated worklist for 0 concepts.
- `pnpm i18n:validate -- --locale zh-HK`: passed with `valid: true`.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm i18n:sweep:zh-HK -- --autostart`: passed with `issueCount: 0` across 139 public routes, 4 signed-in free routes, and 8 signed-in premium routes.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-025 zh-HK Overlay Validation Gate

Current state: `OML-QA-025` is complete. The zh-HK overlay validator now runs locally through the package script on this Mac, the six structural overlay errors are repaired, and the generated zh-HK i18n artifacts are refreshed.

### Files Changed

- `package.json`: switches the i18n Python scripts from `python` to `python3`.
- `tools/i18n/validate_overlays.py`: accepts the pnpm-forwarded leading `--` before validator arguments.
- `content/i18n/zh-HK/concepts/*`: repairs the six structural zh-HK overlay mismatches named in `TASKS.md`.
- `content/i18n/zh-HK/manifest.json`, `content/i18n/generated/zh-HK.json`, `content/_meta/generated/concept-variant-manifest.json`: refreshed generated i18n artifacts.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm i18n:validate -- --locale zh-HK`: passed with `valid: true`, no problems, and no stale items.
- `pnpm content:registry`: passed.
- `pnpm i18n:check:zh-HK`: passed with `issueCount: 0`.
- `pnpm exec vitest run tests/i18n tests/app/public-route-i18n.test.ts tests/components/locale-switcher.test.tsx tests/app/locale-redirects.test.ts`: passed, 76/76.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-024 Mobile Concept Touch Targets

Current state: `OML-QA-024` is complete. The remaining first-screen mobile touch-target gaps are fixed for the UCM drag handle, boolean simulation controls, and the mobile header brand link.

### Files Changed

- `components/simulations/UCMSimulation.tsx`: adds a transparent 44px hit region around the draggable particle.
- `components/simulations/ControlPanel.tsx`: keeps checkbox visuals compact while giving boolean simulation controls a 44px accessible label target.
- `components/layout/SiteHeader.tsx`: raises the mobile brand link hit area to the 44px touch floor.
- `tests/e2e/concept-mobile-touch-targets.spec.ts`: adds the focused mobile first-screen target-size audit for UCM, binary search, and SHM.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed for worker patch `e33f7fe`.
- `pnpm exec eslint components/layout/SiteHeader.tsx components/simulations/ControlPanel.tsx components/simulations/UCMSimulation.tsx tests/e2e/concept-mobile-touch-targets.spec.ts`: passed.
- `pnpm exec vitest run tests/components/controlPanel.test.tsx tests/components/site-header.test.tsx`: passed, 14/14.
- `PLAYWRIGHT_PORT=3234 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-024-orchestrator pnpm exec playwright test tests/e2e/concept-mobile-touch-targets.spec.ts --project=chromium`: passed, 1/1.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-023 Post-Bench Concept Support IA

Current state: `OML-QA-023` is complete. Concept pages now keep the post-bench flow to one primary wrap-up/practice path, one secondary reference path, and one tucked study-tools/progress/share/coach disclosure instead of stacking duplicate next-step/support surfaces.

### Files Changed

- `components/concepts/ConceptPageFramework.tsx`: consolidates progress, exact bench links, sharing, Coach, and support rail content into one `Study tools and progress` post-bench disclosure.
- `components/concepts/ConceptPageV2Shell.tsx`: removes the old hero/status post-lab context slot so status no longer competes near the live lab/wrap-up path.
- `tests/components/concept-page-framework.test.tsx`: updates framework expectations for the consolidated post-bench tools IA.
- `tests/e2e/concept-page-hero-ordering.spec.ts`: adds the route-level OML-QA-023 gate over SHM, UCM, electric fields, acid/base, and binary search, then stabilizes the layout-order assertion.
- `tests/e2e/*`: updates affected post-bench/status/helper expectations to use the consolidated tools disclosure.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check 2808af6..HEAD`: passed for the combined worker/repair patch.
- `pnpm exec eslint components/concepts/ConceptPageFramework.tsx components/concepts/ConceptPageV2Shell.tsx tests/components/concept-page-framework.test.tsx tests/e2e/ai-coach-floating-layout.spec.ts tests/e2e/calculus-phase-content.spec.ts tests/e2e/concept-page-hero-ordering.spec.ts tests/e2e/concept-page-status-surface.spec.ts tests/e2e/concept-page-v2-flow.spec.ts tests/e2e/concept-phase-flow.spec.ts tests/e2e/helpers.ts`: passed.
- `pnpm test tests/components/concept-page-framework.test.tsx -- --runInBand`: passed, 26/26.
- `PLAYWRIGHT_PORT=3233 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-023-orchestrator-final pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-hero-ordering.spec.ts -g "post-bench IA"`: passed, 1/1.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-022 Concept Helper Overlay Layout

Current state: `OML-QA-022` is complete. Concept pages now keep Coach and Feedback affordances out of the protected live lab: Coach renders in-flow below the live bench, and concept-page Feedback uses an inline placement near the page bottom instead of a floating overlay.

### Files Changed

- `components/ai/AiLearningCoachPanel.tsx`: converts the coach widget from a fixed viewport overlay to an in-flow helper panel/trigger.
- `components/concepts/ConceptPageFramework.tsx`: places Coach after the protected concept live lab instead of outside the concept shell as a floating widget.
- `components/feedback/FeedbackWidget.tsx`, `components/layout/PageShell.tsx`: add inline Feedback placement for concept pages while preserving the floating placement elsewhere.
- `tests/e2e/ai-coach-floating-layout.spec.ts`: adds protected-live-lab overlap checks for Coach and Feedback across desktop, tablet, and phone concept cases.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed for the worker patch.
- `pnpm exec eslint components/ai/AiLearningCoachPanel.tsx components/concepts/ConceptPageFramework.tsx components/feedback/FeedbackWidget.tsx components/layout/PageShell.tsx tests/e2e/ai-coach-floating-layout.spec.ts`: passed.
- `PLAYWRIGHT_PORT=3212 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-022-orchestrator pnpm exec playwright test tests/e2e/ai-coach-floating-layout.spec.ts`: passed, 4/4.
- `PLAYWRIGHT_PORT=3214 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-022-visual-audit-loaded pnpm exec playwright test tests/e2e/output/oml-qa-022-visual-audit.spec.ts --project=chromium`: passed; loaded desktop/tablet/phone screenshot audit found Coach and Feedback clear of the protected live lab. Screenshots and metrics are under `output/qa-oml-qa-022-2026-05-29/orchestrator-visual-audit/`.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-021 Mobile Simulation Visual Readability

Current state: `OML-QA-021` is complete. Mobile concept benches now prioritize the live visual for Electric Fields, Unit Circle, Conservation of Momentum, and Reaction Rate by scaling/cropping the SVG scene toward the core model, hiding nonessential scene header prose on phone widths, and moving dense readout details into a mobile disclosure with a 44px summary target.

### Files Changed

- `components/simulations/SimulationMobileReadoutDetails.tsx`: adds the shared mobile readout disclosure used when dense SVG readout cards are cropped away from the phone-first view.
- `components/simulations/primitives/scene-card.tsx`: supports compact mobile scene headers for simulations that need the visual to carry the first viewport.
- `components/simulations/ElectricFieldsSimulation.tsx`, `components/simulations/UnitCircleRotationSimulation.tsx`, `components/simulations/ConservationMomentumSimulation.tsx`, `components/simulations/ReactionRateCollisionTheorySimulation.tsx`: enlarge the phone visual priority area, hide secondary header microcopy on phone, and expose the affected readouts through the mobile panel.
- `tests/components/*simulation.test.tsx`: updates affected simulation component coverage for the duplicated desktop/mobile readout surfaces.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- Targeted ESLint for changed simulation/test files and the temporary visual-audit spec: passed.
- `pnpm exec vitest run tests/components/electric-fields-simulation.test.tsx tests/components/unit-circle-rotation-simulation.test.tsx tests/components/conservation-momentum-simulation.test.tsx tests/components/reaction-rate-collision-theory-simulation.test.tsx`: passed, 10/10.
- `PLAYWRIGHT_PORT=3211 OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX=-oml-qa-021-orchestrator pnpm exec playwright test tests/e2e/output/oml-qa-021-mobile-visual-audit.spec.ts --project=chromium`: passed; captured `390x844` and `360x740` screenshots for the four named concepts under `output/qa-oml-qa-021-2026-05-29/orchestrator-visual-audit/`.
- Screenshot inspection found the main objects, active labels, and live-output/readout affordance identifiable without zooming; no target blocker was found.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-020 Concept First-Viewport Density

Current state: `OML-QA-020` is complete. Representative concept pages now keep the first viewport lighter by removing secondary control/graph prose from the live bench, compacting current-step goal/action copy without hiding the action, collapsing Step tools by default, and trimming dense simulation readouts.

### Files Changed

- `components/concepts/ConceptPageV2Panels.tsx`: compacts current-step cue goal/action text at phrase boundaries and keeps the visible `Do this` action unclipped.
- `components/simulations/ControlPanel.tsx`, `components/simulations/ConceptSimulationRenderer.tsx`, `components/concepts/CompactModeTabs.tsx`: remove first-viewport description copy from visible controls, collapse Step tools by default, and maintain 44px touch targets.
- `app/globals.css`, `components/graphs/LineGraph.tsx`, `components/simulations/*`, `components/simulations/primitives/*`: hide secondary graph/readout notes in the focused live bench and trim dense visual/readout labels on representative simulations.
- `tests/e2e/concept-layout.spec.ts`, `tests/e2e/concept-page-v2-flow.spec.ts`: update focused expectations and strengthen current-step cue readability coverage.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm exec playwright test tests/e2e/output/oml-qa-020-density-audit.spec.ts`: passed; representative desktop/tablet pages stayed below 260 visible words and phone/short-phone pages stayed below 180.
- `pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-015"`: passed, including current-step goal/action clipping checks.
- Representative screenshots for desktop, tablet, phone, and short-phone density cases were inspected; no blocker was found.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-019 Contextual Guided Bench Tools

Current state: `OML-QA-019` is complete. Guided concept benches now expose contextual Step tools beside the current-step cue so learners can open revealed controls, graphs, overlays, equations, and prediction prompts from the live bench instead of scrolling to the lower support panels.

### Files Changed

- `components/simulations/ConceptSimulationRenderer.tsx`: adds the guided Step tools drawer, active bench tool panel, reveal/graph/overlay/equation/prediction focus handlers, and guided equation selection.
- `messages/en.json`, `messages/zh-HK.json`: adds localized Step tools labels.
- `tests/e2e/concept-page-v2-flow.spec.ts`: covers SHM and UCM phone flows for opening each contextual bench tool from the current-step surface.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check HEAD^..HEAD`: passed for the worker patch.
- `pnpm exec eslint components/simulations/ConceptSimulationRenderer.tsx tests/e2e/concept-page-v2-flow.spec.ts`: passed.
- `pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g OML-QA-019`: passed, covering SHM and UCM phone flows.
- Phone screenshots for SHM and UCM contextual prediction state were inspected.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-018 Guided Compare Mode

Current state: `OML-QA-018` is complete. Guided concept benches now expose Compare mode as a compact in-bench control when the regular interaction-mode tabs are hidden. Learners can enter Compare, edit Setup A/B, swap setups, reset the active variant, exit Compare, and keep the current guided step context intact.

### Files Changed

- `components/simulations/ConceptSimulationRenderer.tsx`: adds the guided Compare entry surface and routes compare tools into the control panel for guided benches.
- `tests/components/concept-simulation-renderer-compare.test.tsx`: covers guided Compare entry/exit and guided-step preservation.
- `tests/e2e/concept-page-v2-flow.spec.ts`: adds desktop and phone coverage for SHM, electric fields, and acid/base Compare entry, setup editing, swap/reset, exit, and guided-step continuity.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for the worker patch.
- `pnpm exec eslint components/simulations/ConceptSimulationRenderer.tsx tests/components/concept-simulation-renderer-compare.test.tsx tests/e2e/concept-page-v2-flow.spec.ts`: passed.
- `pnpm exec vitest run tests/components/concept-simulation-renderer-compare.test.tsx`: passed, 8/8.
- `pnpm test:e2e:concept-v2 --grep "OML-QA-018"`: passed, 1/1, covering SHM, electric fields, and acid/base at desktop and phone widths.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-017 Guided Rail Quick Checks

Current state: `OML-QA-017` is complete. Guided rail and support quick-check choices are now real answer controls with radio semantics, selected state, and correct/incorrect feedback. The inline check data preserves choice ids/correctness/feedback from prediction and quick-test content, and the duplicate secondary prediction drawer is hidden while a guided inline check with choices is active.

### Files Changed

- `components/concepts/ConceptPageV2Panels.tsx`: renders inline-check choices as interactive radio controls with live feedback.
- `lib/content/concept-page-v2.ts`: carries choice ids, correctness, and feedback into resolved inline-check view models.
- `components/simulations/ConceptSimulationRenderer.tsx`: suppresses the repeated secondary prediction flow when the active guided step already has an inline check.
- `messages/en.json`, `messages/zh-HK.json`: added localized inline-check feedback/instruction copy.
- Tests: added component coverage and an `OML-QA-017` Playwright flow for SHM and UCM inline guided checks.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `pnpm test tests/components/concept-page-v2-panels.test.tsx -- --runInBand`: passed, 26/26.
- `pnpm exec playwright test tests/e2e/concept-page-v2-flow.spec.ts --grep "OML-QA-017"`: passed, 1/1.
- `pnpm validate:content`: passed.
- `pnpm typecheck`: passed.

## 2026-05-29 OML-QA-016 Mobile Concept Control Stack

Current state: `OML-QA-016` is complete. Phone concept benches now keep presets behind a dedicated disclosure, keep secondary controls in `More controls`, and avoid force-opening the secondary stack just because a guided step reveals a control. The scene, compact current task, primary controls, and graph surface are reachable within the mobile 1.5-viewport target on the audited representative concepts.

### Files Changed

- `components/simulations/ControlPanel.tsx`: split phone presets into their own collapsed disclosure, kept secondary controls/tools behind `More controls`, and reset both disclosures on Reset.
- `components/simulations/ConceptSimulationRenderer.tsx`: removed the guided-reveal force-open path so revealed controls stay highlighted without expanding the whole secondary stack.
- `messages/en.json`, `messages/zh-HK.json`: added localized copy for the new control and preset disclosures.
- Tests: expanded `ControlPanel` component coverage and added an `OML-QA-016` mobile concept-layout audit over SHM, UCM, projectile motion, electric fields, unit circle, and reaction rate at 390x844 and 360x740.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for the worker patch.
- `pnpm test tests/components/controlPanel.test.tsx`: passed, 8/8.
- `pnpm exec playwright test tests/e2e/concept-layout.spec.ts -g "OML-QA-016"`: passed, 1/1, covering the representative mobile route matrix and tap-target audit in the focused spec.
- Screenshot/metric audit over the same six routes at 390x844 and 360x740: passed for the `OML-QA-016` control-stack/layout target; known small touch-target findings remain tracked separately by `OML-QA-024`.
- `pnpm typecheck`: passed.

## 2026-05-28 OML-QA-015 Concept Bench Current Step Cue

Current state: `OML-QA-015` is complete. Guided concept benches now show a compact current-step cue near the live model and controls, with step count, goal, and action visible inside the first usable bench viewport without restoring the old `Try this first` / first-action rail.

### Files Changed

- `components/concepts/ConceptPageV2Panels.tsx`: added the compact reusable current-step cue.
- `components/simulations/ConceptSimulationRenderer.tsx`: passes the active guided step into the live bench shell.
- `components/simulations/SimulationShell.tsx`: docks the cue above controls on desktop, after the scene on phone, and near the stage on tablet layouts.
- Tests: added component coverage and a Playwright audit over SHM, UCM, projectile motion, electric fields, unit circle, and acid/base at desktop, tablet, and phone viewports.
- Tracking: `TASKS.md`, `STATUS.md`.

### Validation Run

- `git diff --check`: passed.
- `git diff --check HEAD^..HEAD`: passed for the worker patch.
- `pnpm exec playwright test -c playwright.concept-v2.config.ts tests/e2e/concept-page-v2-flow.spec.ts -g "OML-QA-015"`: passed, 1/1; captured 24 representative screenshots.
- Screenshot inspection passed for representative desktop, tablet, and phone captures; the cue is visible in the first usable bench viewport and the old first-action rail test IDs are absent.
- `pnpm typecheck`: passed.

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
