# Open Model Lab Concept Page Framework

Open Model Lab concept pages now use one shared assembly model instead of each route stacking sections by hand.

## Canonical Regions

Every concept page follows the same top-level structure:

1. concept header
2. interactive lab
   - equation map
   - stage
   - controls
   - live prompt surface
   - time rail
   - compact interaction panels
   - challenge panel
   - graphs
3. lower learning sections
4. read-next progression links

The interactive lab is standard. The lower learning sections are assembled from a bounded section contract.

## Standard Section Contract

Supported lower-page section ids are:

- `explanation`
- `keyIdeas`
- `workedExamples`
- `commonMisconception`
- `miniChallenge`
- `quickTest`
- `accessibility`
- `readNext`

Default placement is handled by the framework:

- `overview`: explanation, key ideas
- `practice-main`: worked examples
- `practice-aside`: misconception, mini challenge
- `assessment`: quick test
- `support-main`: accessibility
- `support-aside`: read next

## Optional Section Configuration

Rich content can optionally define:

```json
{
  "pageFramework": {
    "sections": [
      { "id": "keyIdeas", "title": "Core ideas" },
      { "id": "miniChallenge", "enabled": false }
    ]
  }
}
```

The framework supports:

- `enabled`
- `title`
- `order`

The config is bounded on purpose. It changes section behavior without turning Open Model Lab into a page-builder CMS.

## Learning-Surface Roles

The framework keeps the current features, but gives them clearer roles:

- Live `What to notice`: context-sensitive cue near the interaction area
- `keyIdeas`: lower-page durable summary points
- Worked examples: full frozen walkthroughs on free, live current-state math on Premium
- Challenge mode: compact problem-solving tasks evaluated from the live simulation state
- Quick test: compact conceptual check
- Read next: progression and contrast links from the registry

## Lower-Page Learning Phases

The shared framework now uses a phased lower-page learning flow on the existing single concept route. The shared phase contract still applies only to the lower-page sections:

- `explore`: explanation, key ideas
- `understand`: worked examples, common misconception, accessibility
- `check`: mini challenge, quick test, read next

The route model is still single-page. `/concepts/[slug]` keeps one mounted live lab and one lower learning stack. The phase UI only decides which lower-page phase is visible at a given moment.

The canonical lower-page contract in `lib/content/concept-page-framework.ts` remains the source of truth for section availability, ordering, and bounded author overrides. The learning-phase contract sits above that resolved section list and groups it into stable phase ids for future steppers, tabs, or deep-link-aware phased navigation.

The live lab runtime and near-lab challenge mode are unchanged:

- the interactive lab remains outside the learning-phase grouping
- challenge mode near the lab remains unchanged
- the lower-page phase UI uses localized labels from the message catalogs
- lower-page sections still render through the existing shared framework contract

Optional URL phase state is also supported through `?phase=explore|understand|check`.

Initial lower-page phase resolution is deterministic:

1. if the current hash targets a lower-page section, use that section's owning phase
2. else if the URL has a valid `?phase=` value, use that phase
3. else use the first visible phase from the resolved lower-page sections
4. else fall back to `explore`

Section-level anchor compatibility is preserved. The page shell still exposes section anchor links, and when a hash points to a lower-page section inside a different phase, the concept page activates the owning phase first and then scrolls to that section anchor. Shared section-nav clicks now send a bounded navigation-intent signal before scrolling, so hidden lower-page targets activate their owning phase immediately even when the hash is already the current one.

Manual phase switches keep the URL truthful without changing the single-route model. The client updates `?phase=` in place, preserves hashes that still point to visible content, and rewrites stale hidden-section hashes to the first visible anchor in the newly active phase when needed.

## Shared Runtime State

The concept-page runtime bridge publishes one shared snapshot of live state for learning surfaces. It includes:

- concept slug/title/topic
- current params
- current inspected or live time
- active graph
- interaction mode
- compare target
- overlay state
- feature availability

Challenge mode is intentionally near the interactive lab rather than the lower-page section stack. It reuses the same live state, graph choice, inspect time, and compare setup instead of introducing a parallel challenge state machine.

This is the seam that tier-aware worked examples and future lower-page learning surfaces should use instead of inventing their own bridge.

## Adding A New Concept

1. Add canonical metadata in `content/catalog/concepts.json`.
2. Add rich content in `content/concepts/<contentFile>.json`.
3. Use the default concept-page framework unless the concept needs a bounded section override.
4. Implement or select the simulation kind.
5. Run the verification commands.

Most future concept additions should now be metadata + content + simulation work, not page-level component surgery.
