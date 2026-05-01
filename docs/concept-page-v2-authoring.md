# Concept Page V2 Authoring

Use this when migrating a published concept from fallback V2 to explicit authored V2.

## Canonical field

Author explicit lessons in the concept JSON under top-level `v2`, not `pageV2`:

```json
"v2": {
  "intuition": "One-sentence plain-language entry point.",
  "whyItMatters": "One short reason this concept matters.",
  "estimatedMinutes": 10,
  "equationSnapshot": ["equation-id-a", "equation-id-b"],
  "startSetup": {
    "presetId": "preset-id",
    "graphId": "graph-id",
    "overlayIds": ["overlay-id"]
  },
  "guidedSteps": [
    {
      "id": "read-the-pattern",
      "title": "Read the pattern",
      "goal": "What the learner is trying to establish in this step.",
      "doThis": "Concrete action on the live bench.",
      "notice": "Visible signal to pay attention to.",
      "explain": "Why that signal matters conceptually.",
      "reveal": {
        "controlIds": ["control-id"],
        "graphIds": ["graph-id"],
        "overlayIds": ["overlay-id"],
        "toolHints": ["timeline"]
      },
      "setup": {
        "presetId": "preset-id",
        "graphId": "graph-id",
        "overlayIds": ["overlay-id"]
      },
      "inlineCheck": {
        "predictionIds": ["prediction-id"]
      }
    }
  ],
  "wrapUp": {
    "learned": [
      "Short learner-facing takeaway.",
      "Second takeaway.",
      "Third takeaway."
    ],
    "misconception": "Short myth or confusion to correct.",
    "workedExampleRefs": ["worked-example-id"],
    "testCta": true,
    "nextConcepts": [
      {
        "slug": "next-concept-slug",
        "title": "Next Concept Title",
        "reasonLabel": "Why this is next"
      }
    ],
    "freePlayPrompt": "Specific free-play prompt tied to the same bench."
  },
  "referenceSections": ["explanation", "keyIdeas", "workedExamples", "quickTest"]
}
```

## Default migration pattern

Use a 3-4 step spine unless the concept clearly needs more:

1. `read / orient`
2. `change / compare`
3. `separate the tricky distinction`
4. `check / transfer`

Keep every step in the same rhythm:

- `goal`: what the learner is trying to establish
- `doThis`: the exact action to take on the live bench
- `notice`: the visible signal to watch for
- `explain`: the concept meaning behind that signal

## Authoring rules

- Reuse real concept ids. `equationSnapshot`, `reveal`, `setup`, `inlineCheck`, and `workedExampleRefs` must point to ids that already exist in the same concept file.
- Prefer one bounded reveal slice per step. Do not expose the whole bench at once unless the concept truly needs it.
- Use `predictionIds` early when the learner should guess before changing the model.
- Use `questionIds` later when the learner should explain what they now understand.
- Use `includeMiniChallenge` when the concept already has a good mini-challenge prompt and you want that to act as the inline check.
- Keep equation snapshots compact: two ids is the current norm.
- Always write `whyItMatters` when migrating. Fallback can survive without it; authored V2 should not.
- Make `freePlayPrompt` operational. It should tell the learner exactly what kind of setup to build or compare next.
- Inline math should use the supported `$...$` convention in authored concept strings. Shared concept-page surfaces render authored text through the math-aware rich-text path, so do not hand-convert those strings into plain-text fallbacks.

## Good migration sources inside an existing concept

- `pageIntro.definition` -> seed `intuition`
- `pageIntro.whyItMatters` or `sections.keyIdeas` -> seed `whyItMatters`
- `pageIntro.keyTakeaway` and `sections.keyIdeas` -> seed `wrapUp.learned`
- `sections.commonMisconception.myth` -> seed `wrapUp.misconception`
- `sections.workedExamples.items[*].applyAction` -> seed `setup` and `reveal`
- `simulation.ui.starterExploreTasks` -> seed early `doThis`
- `predictionMode.items[*]` and `quickTest.questions[*]` -> seed `inlineCheck`

## Minimum migration checklist

- Add `v2.guidedSteps` with at least 3 real steps.
- Add `whyItMatters`, `estimatedMinutes`, and `equationSnapshot`.
- Add at least one `inlineCheck`.
- Add `wrapUp.learned`, `misconception`, `testCta`, and `nextConcepts`.
- Keep `referenceSections` calm and secondary.
- Run:
  - `pnpm content:registry`
  - `pnpm validate:content`
  - `pnpm content:doctor`
  - `pnpm exec playwright test -c playwright.concept-v2.config.ts`
