# Open Model Lab Rich Content Authoring

Open Model Lab now separates concept authoring into two layers:

- canonical metadata in `content/catalog/concepts.json`
- rich teaching content in `content/concepts/*.json`

This document covers the rich-content side. For the canonical catalog fields and relationship rules, see [concept-metadata.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/concept-metadata.md).
For the higher-level concept-wave workflow, see [content-authoring-playbook.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/content-authoring-playbook.md).
For offline optimized/localized overlay workflow, provenance, and fallback rules, see [content-editorial-workflow.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/content-editorial-workflow.md).
For the quiz session model, generated templates, retry flow, and five-question minimum, see [quiz-authoring.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/quiz-authoring.md).

## What Belongs In Rich Content

Each file in `content/concepts/` owns the teaching surface for one concept:

- optional `pageFramework`
- `sections.explanation`
- `sections.keyIdeas`
- `sections.commonMisconception`
- `sections.workedExamples`
- `sections.miniChallenge`
- `equations`
- `variableLinks`
- `simulation.defaults`, `simulation.controls`, `simulation.presets`, `simulation.overlays`
- `graphs`
- `noticePrompts`
- `predictionMode`
- optional `challengeMode`
- `quickTest`
- `accessibility`
- optional `seo`

Rich content does not own canonical catalog metadata such as `title`, `summary`, `topic`, `difficulty`, `sequence`, `published`, or relationships. Those live in `content/catalog/concepts.json`.

Optimized English and localized content do not replace these rich-content files. They live as partial overlays under `content/optimized/concepts/*.json` and `content/i18n/<locale>/concepts/*.json`.

## Authoring Rules

- Keep rich content hand-editable and structured.
- Do not add top-level metadata like `slug`, `title`, or `topic` back into `content/concepts/*.json`.
- Use `pageFramework.sections` only when a concept needs a bounded section override such as hiding a standard section or changing a section label.
- Keep ids stable inside arrays such as equations, prompts, quick-test questions, worked examples, overlays, and presets.
- When a teaching surface references a control, graph, overlay, or equation variable, use the real ids from the same concept file.
- If the simulation kind needs to change, update the catalog metadata entry, not the rich content file.

## Adding A New Concept

1. Add the canonical metadata row to `content/catalog/concepts.json`.
2. Create the rich content file referenced by `contentFile`.
3. Keep the file focused on teaching content, not catalog metadata.
4. Run `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.

Most future concept additions should now be a metadata + content task rather than a component rewrite.

## Rich Content Sections

### Equations

- Keep equations short and atomic.
- Use `latex`, `label`, and `meaning` consistently.
- Add `notes` only when the relationship needs a short explanation.

### Variable Links

- `variableLinks.param` must match a real control param.
- `equationIds` should list the matching equation cards.
- `graphIds` and `overlayIds` should only reference real graph and overlay ids from the same concept.

### Simulation UI Hints

- `simulation.ui` is optional. Leave it undefined when the concept should keep the shared legacy first-load behavior.
- `initialGraphId` picks the first Explore graph tab. It must match a real graph id from `graphs`.
- `primaryControlIds` chooses which controls stay visible before `More tools`. It must use real `simulation.controls[*].id` values.
- `primaryPresetIds` chooses which presets stay visible before `More tools`. It must use real `simulation.presets[*].id` values.
- `starterExploreTasks` adds the lightweight Explore starter card near the live bench. If it is omitted, no starter guide is shown.
- Invalid authored ids fail content validation during the registry/build path with actionable errors. Runtime still falls back defensively to the first graph and legacy visibility splits so a bad registry does not crash the page.
- Duplicate ids in `primaryControlIds` / `primaryPresetIds` are de-duplicated in authored order.

### Live Worked Examples

- Keep one concept’s examples compact and explicit.
- Use predefined templates and value keys; do not author symbolic algebra steps.
- `applyAction` should reuse a real preset, patch, or highlight target.

### Quick Test

- Keep questions conceptual.
- Use plausible distractors.
- `showMeAction` should point at real controls, graphs, overlays, or presets.
- The shared quiz session now supports `static`, `generated`, and `hybrid` modes through `quickTest.mode`.
- Keep `quickTest.questionCount >= 5` when you author it explicitly.
- `quickTest.templates` can point at reusable generated templates such as `worked-example-result` or `exact-angle-radians`.
- If a concept has fewer than 5 authored quick-test questions, the shared quiz engine fills the remainder from generated templates instead of silently shipping a shorter quiz.

### Challenge Mode

- `challengeMode` is the compact problem-solving layer that evaluates the real live simulation state instead of creating a second task model.
- Keep challenges bounded. One or two strong tasks per concept is better than a long gamified ladder.
- Prefer `requirements` plus `targets` for most challenge authoring:
  - `requirements` covers repeated wiring such as the active graph, overlays that must stay visible, inspect mode, compare mode, and optional inspect-time windows.
  - `targets` covers the actual live state band to hit. Each target can point at a live `param`, a live derived `metric`, or a compare-setup `param` / `metric`.
  - `checks` still exists for unusual cases, but it should now be the exception rather than the default authoring path.
- `setup` is still the suggested starting point, but it can stay smaller now because `requirements.graphId`, `requirements.overlayIds`, and compare requirements normalize into the reusable setup helpers automatically.
- Prefer challenges that force the learner to use the graph, overlays, inspect time, or compare mode honestly rather than just matching a slider by eye.

Example compact shape:

```json
{
  "id": "pm-ch-flat-far-shot",
  "title": "Flat long shot",
  "style": "target-setting",
  "prompt": "Stretch the landing point without turning it into a very tall arc.",
  "successMessage": "Solved.",
  "setup": {
    "presetId": "earth-shot",
    "note": "Use the trajectory graph and landing marker together."
  },
  "requirements": {
    "graphId": "trajectory",
    "overlayIds": ["rangeMarker"]
  },
  "targets": [
    {
      "metric": "range",
      "min": 35,
      "max": 38,
      "displayUnit": "m"
    },
    {
      "metric": "maxHeight",
      "min": 7,
      "max": 10,
      "displayUnit": "m"
    }
  ]
}
```

### Notice Prompts

- Keep prompts short.
- Add conditions only when the current graph, mode, overlay, or inspected state genuinely changes what the learner should notice.

### Concept Page Framework

- The page header and interactive lab are standard parts of the shared concept-page framework.
- Lower-page sections are assembled from the canonical section contract instead of ad hoc JSX order.
- The live prompt system owns the name `What to notice`.
- The lower static summary section is now `sections.keyIdeas`, which exists to summarize durable takeaways rather than compete with the live prompt panel.
- Supported section ids for `pageFramework.sections` are:
  - `explanation`
  - `keyIdeas`
  - `workedExamples`
  - `commonMisconception`
  - `miniChallenge`
  - `quickTest`
  - `accessibility`
  - `readNext`

## Validation

The loader fails fast when rich content is malformed. Common failures include:

- unknown graph ids
- unknown overlay ids
- unknown control params
- duplicate item ids
- broken quick-test or prediction references
- worked-example references to missing variables or presets

If a rich-content file is invalid, the concept registry build fails instead of letting pages drift into partial state.

## Local Author Preview

- Run `pnpm validate:content` when you want the focused content-integrity suite without the rest of the test matrix.
- Run `pnpm content:doctor` when you want the higher-level integration report for subject/topic/track/setup wiring and discovery assumptions.
- Keep `pnpm dev` running and open `/author-preview` for a developer-only summary of concept coverage, track wiring, and direct preview links.
- Use `/author-preview/concepts/[slug]` to render the shared concept-page framework for a specific concept, including draft content that is not publicly routable yet.
