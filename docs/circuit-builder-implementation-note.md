# Circuit Builder Implementation Note

## What was built

- Added a dedicated public `/circuit-builder` route plus the locale wrapper at `/[locale]/circuit-builder`.
- Added a reusable `lib/circuit-builder/*` domain layer for:
  - circuit document types
  - component metadata and educational copy
  - starter presets
  - geometry helpers
  - DC steady-state solver
  - inspector graph builders
- Added `components/circuit-builder/*` UI for:
  - component palette
  - SVG symbol registry
  - interactive workspace
  - inspector panel
  - reducer-driven page container
  - document-level ambient temperature and light controls
  - explicit selected-item toolbar actions for rotate/delete/export
  - inspector placement controls for `Position X`, `Position Y`, and grid nudging
- Added first-class diagram export from the circuit document:
  - SVG download for the current schematic
  - JSON state copy/export for the current document model
  - JSON file download and import for round-trip circuit persistence
- Added bounded undo/redo history for meaningful document edits and destructive replacement recovery.
- Added local autosave with restore/dismiss/discard recovery for refresh and accidental navigation resilience.
- Added a local saved-circuits library for intentional named saves that is separate from the autosave recovery slot.
- Added account-backed saved circuits for eligible signed-in users through the existing account session and premium capability seam.
- Added focused tests for solver behavior, route rendering, header navigation, and core add/edit/connect interaction flow.
- Added sensor-focused onboarding presets so new users can reach the thermistor and LDR ambient behaviors without wiring from scratch.

## Solver assumptions and simplifications

- The workspace uses graph-based DC steady-state analysis with wires collapsing connected terminals into shared nodes.
- Batteries are ideal voltage sources.
- Resistors are linear.
- Ammeters and closed switches use very small resistances instead of perfect zero resistance.
- Voltmeters use very large resistance instead of perfect infinite resistance.
- Capacitors are treated as open circuits after settling.
- Thermistors and LDRs can run either in a fixed manual-resistance mode or in an ambient-linked mode driven by page-level environment controls.
- Diodes use a bounded piecewise threshold approximation instead of a full nonlinear diode equation.
- Light bulbs are resistive loads derived from rated voltage and power.
- Fuses trip instantly once the steady-state current exceeds the rating and stay blown until reset.

## Known limitations

- The builder currently supports branch circuits by wiring multiple components to the same terminal nodes, but it does not yet expose standalone junction-dot parts.
- Capacitor graphs only appear for simple single-source RC-style contexts; the page does not attempt a full transient solve for arbitrary networks.
- Diode behavior is intentionally simplified and should be read as an educational approximation.
- Thermistor and LDR ambient-linked curves are deliberately simple teaching models, not device-calibrated component models.
- PNG export is intentionally deferred for now. The SVG export is deterministic and model-driven, while PNG would be added later through the same SVG pipeline rather than through page screenshots.
- The wider repo currently has unrelated pre-existing `tsc --noEmit` failures in content/editorial files outside the Circuit Builder slice, so full-repo typecheck is not a clean gate for this feature yet.

## Interaction notes

- The page now prioritizes the builder bench over long stacked sections:
  - the intro copy is intentionally shorter
  - presets and the action band are compacted into a tighter control band
  - saved-circuit management stays available lower on the page instead of pushing the bench further down
- The main desktop builder area behaves like a bounded editor row:
  - component library on the left
  - workspace in the center
  - inspector on the right
  - the desktop component library matches the workspace height and scrolls internally
- The component library now includes a live search field:
  - it filters in place without affecting the workspace or document state
  - it matches labels, summaries, and a small set of aliases such as `ldr`, `power supply`, and `bulb`
  - desktop and mobile palette surfaces both expose the same search input
- Ambient controls now live beside the workspace instead of in a large page block:
  - desktop uses a compact collapsible environment control in the workspace header
  - the collapsed state shows current temperature and light at a glance
  - mobile and narrow layouts fall back to a compact disclosure above the workspace instead of a floating overlay
- Palette items expose stable button labels such as `Add Resistor` and `Add Battery`.
- Ambient controls remain page-level and workspace-adjacent:
  - `Ambient temperature`
  - `Light intensity`
- The ambient card now also names the affected components explicitly:
  - `Thermistor -> temperature`
  - `LDR -> light intensity`
  - `Manual mode ignores ambient changes`
- The workspace stays selection-driven:
  - adding a component selects it
  - clicking or dragging a component on the canvas keeps that component selected
  - wiring a selected component keeps that component selected
  - selecting a wire from the canvas hit target opens the wire inspector directly
  - deleting the selected item clears the inspector and returns focus to the workspace region
- `Clear workspace` now lives in the workspace control row beside `Zoom -`, `Zoom +`, and `Reset view`, so reset reads as a bench action instead of a file-management action.
- Direct manipulation options now include:
  - pointer drag on the workspace
  - inspector position inputs for `Position X` and `Position Y`
  - inspector nudge controls for one-grid-step moves
  - toolbar and inspector rotate/delete actions
- Thermistors and LDRs can switch between:
  - `Ambient-linked`, which follows the page controls
  - `Manual`, which keeps a fixed resistance and ignores ambient changes
- Sensor-focused presets now exist for onboarding:
  - `Thermistor temperature explorer`
  - `LDR light explorer`
  - both use a simple series loop so current and bulb-load changes are easy to see
- Wire editing now has two supported paths:
  - direct wire selection on the workspace
  - the `Connections` list below the workspace, which is easier to use on smaller screens or with keyboard navigation
- Toolbar actions are intentionally disabled when they do not apply:
  - `Undo` when no tracked edit is available
  - `Redo` when there is no redo state available
  - `Download SVG` when the workspace is empty
  - `Rotate selected` when no component is selected
  - `Delete selected` when nothing is selected
- Status messaging for delete, JSON copy, and SVG export uses the same page-level status area.
- The top action band now uses a compact grouped-toolbar hierarchy instead of one long wall of pills:
  - `History` stays directly visible with `Undo` and `Redo`
  - `Selection` stays directly visible with `Rotate selected` and `Delete selected`
  - `Saves` opens local-save and account-save actions without hiding the distinction between them
  - `File` keeps `Download SVG` close at hand while grouping JSON import/export
- Desktop and narrower laptop widths use the same grouped-toolbar model so the action band stays compact instead of wrapping into several rows.
- Smaller widths still keep the grouped controls reachable; the menus expand in flow rather than relying on a floating desktop-only popover model.
- Keyboard shortcuts:
  - `Cmd/Ctrl+Z` -> Undo
  - `Cmd/Ctrl+Shift+Z` -> Redo
  - `Ctrl+Y` -> Redo
- Selecting a wire opens a dedicated wire inspector that explains the ideal-conductor model, shows the shared node voltage when available, and makes wire deletion available without pretending to provide a fake per-wire current reading.
- Selecting a thermistor or LDR now shows:
  - its current mode
  - the effective resistance used by the solver
  - contextual copy explaining whether ambient controls are driving the branch
  - a simplified response graph, with the operating point highlighted when ambient-linked mode is active
- Local autosave is intentionally lightweight:
  - it protects against refresh/reload loss
  - it does not replace explicit JSON save/open
- Named local saves are intentionally separate:
  - autosave draft = accident recovery
  - saved circuits = user-managed named saves
- Account saves are the cross-device layer:
  - autosave draft = local recovery
  - local saved circuits = browser-local named saves
  - account-saved circuits = signed-in cross-device saves for eligible users

## Ambient component models

- Thermistor:
  - ambient-linked mode uses a simplified NTC curve
  - resistance falls monotonically as temperature rises
  - the page temperature control is clamped to `0` to `100 C`
- LDR:
  - ambient-linked mode uses a simplified light-response curve
  - resistance falls monotonically as light intensity rises
  - the page light control is clamped to `0` to `100%`
- Manual mode:
  - thermistors and LDRs can both ignore ambient controls and use a fixed explicit resistance instead
  - this is intentional for free-build experiments and comparison setups

## Export path

- Supported now:
  - SVG diagram export
  - JSON/state export
  - JSON file download and file-based JSON import
- JSON/state export now also preserves:
  - page-level ambient temperature
  - page-level light intensity
  - thermistor ambient/manual mode settings
  - LDR ambient/manual mode settings
  - component geometry and rotation
  - wires and component ids
- Exported SVG includes:
  - component symbols
  - wires
  - component rotation
  - value labels where useful
  - junction dots for multi-branch nodes
- Ambient-linked thermistors and LDRs can show their current effective resistance with concise environment-aware labels in the SVG export.
- Exported SVG intentionally excludes:
  - app chrome
  - selection outlines
  - hover states
  - inspector UI
  - warning banners
- PNG is deferred intentionally. If added later, it should render from the same deterministic SVG output rather than from page screenshots.
- No state-shape migration should be needed for future image export if the current document contract is preserved.

## JSON persistence behavior

- Saved JSON persists only meaningful circuit state:
  - versioned circuit document
  - components, wires, positions, and rotation
  - view state
  - ambient environment
  - thermistor/LDR ambient/manual mode settings and editable values
- Saved JSON intentionally does not persist transient UI state:
  - current selection
  - open disclosure state
  - hover or drag state
  - status messages
- Local autosave uses the same normalized circuit document payload, but wraps it in a local draft envelope with:
  - draft version
  - saved timestamp
  - normalized circuit document
- Import uses centralized normalization and lightweight migration:
  - older documents missing `environment` get safe defaults
  - thermistor and LDR mode flags and manual-resistance fields are backfilled from current defaults when absent
  - malformed JSON or structurally invalid circuit documents show a user-facing error instead of partially loading

## Local saved-circuits library

- Saved circuits are local-only named records with:
  - stable id
  - title
  - created timestamp
  - updated timestamp
  - normalized circuit document payload
- Saved circuits persist the same meaningful document state as JSON save/load:
  - components
  - wires
  - positions and rotation
  - editable values
  - ambient environment
  - thermistor/LDR ambient/manual mode settings
- Saved circuits intentionally exclude:
  - current selection
  - pending wire gesture state
  - hover/drag internals
  - disclosure state
  - status messages
  - undo/redo stacks
- Supported library actions:
  - `Save locally`
  - `Update saved` for the currently opened saved circuit
  - `Open`
  - `Rename`
  - `Delete`
- `Save locally` acts as the intentional save-as-new path. `Update saved` refreshes the current named save in place.
- Opening a saved circuit uses the same normalized document replacement path as presets and JSON import, so it stays compatible with undo/redo, SVG export, JSON export/import, solver behavior, and inspector behavior.

## Account-backed saved circuits

- Account saves reuse the repo’s existing account-content model:
  - authenticated session resolution from `lib/account/supabase.ts`
  - premium capability gating through `canSaveCompareSetups`
  - file-backed per-user ownership in `lib/account/server-store.ts`
  - `/api/account/circuit-saves` CRUD route
- Account saves persist the same normalized circuit document shape as local saves and JSON export:
  - components
  - wires
  - positions and rotation
  - editable values
  - ambient environment
  - thermistor/LDR ambient/manual mode settings
- Account saves intentionally exclude the same transient UI state as local saves and autosave:
  - current selection
  - pending wire gesture state
  - hover/drag internals
  - disclosure state
  - status messages
  - undo/redo stacks
- User-state behavior:
  - signed out: local features still work; account saves show the repo’s sign-in/premium notice
  - signed-in free: local features still work; account saves stay locked behind the repo’s Premium notice
  - signed-in Premium: full save/open/update/rename/delete flow
- Opening an account save uses the same normalized document replacement path as presets, JSON import, and local saved circuits, so solver, inspector, ambient controls, JSON export/import, and SVG export stay coherent.

## Undo / Redo behavior

- History tracks meaningful document edits, including:
  - add/delete component
  - connect/delete wire
  - move and rotate
  - component property edits
  - ambient temperature/light changes
  - preset loads
  - JSON import
  - clear workspace
- History intentionally excludes transient UI state:
  - current selection
  - pending wire gesture state
  - hover state
  - disclosure state
  - status messages
  - drag-in-progress details
- Replacement flows are recoverable:
  - loading a preset can be undone
  - importing JSON can be undone
  - clearing the workspace can be undone
- Restoring a local draft is also treated as a recoverable document replacement.
- Drag movement and ambient-slider edits are coalesced into one undo step per gesture instead of producing history spam.

## Local autosave and recovery

- Autosave stores only the meaningful current circuit document:
  - components
  - wires
  - positions and rotation
  - editable values
  - ambient environment
  - thermistor/LDR mode settings
- Autosave does not store:
  - current selection
  - pending wire gesture state
  - hover or drag internals
  - disclosure state
  - status messages
  - undo/redo stacks
- Recovery flow on page load:
  - `Restore draft`
  - `Dismiss for now`
  - `Discard saved draft`
- Autosave and saved circuits use separate local storage keys so a recovery draft never masquerades as a named saved circuit.
- Account saves stay server-backed and separate from both local storage keys.
- `Dismiss for now` keeps the saved draft in local storage and suppresses automatic overwrite by the untouched blank session.
- `Discard saved draft` removes the stored draft so the prompt does not reappear.
- Invalid or corrupt local drafts are safely discarded with a user-facing status message instead of crashing the page.

## Verification note

- Playwright now verifies the account-save browser flow against the real `/api/account/circuit-saves` route and the real file-backed account store.
- To keep that deterministic and avoid polluting shared local data, `playwright.config.ts` points `OPEN_MODEL_LAB_ACCOUNT_STORE_PATH` at an isolated file under `output/playwright`.
