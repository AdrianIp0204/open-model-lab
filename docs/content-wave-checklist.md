# Content Wave Checklist

Use this for future Math, Chemistry, Computer Science, or physics expansion passes.

## Catalog And Discovery

- Add or update canonical entries in:
  - `content/catalog/concepts.json`
  - `content/catalog/topics.json` when a topic page needs to change
  - `content/catalog/starter-tracks.json` when an authored path changes
  - `content/catalog/recommended-goal-paths.json` only when the learner objective changes
- Recheck subject landing visibility.
- Recheck `/start` and `/search` for stale subject or discovery assumptions.

## Concept Integration

- Add the rich concept file in `content/concepts/`.
- Reuse an existing simulation kind when possible.
- If a new simulation kind is required, wire it through:
  - `lib/content/schema.ts`
  - `lib/content/loaders.ts`
  - `lib/physics/*`
  - `components/simulations/ConceptSimulationRenderer.tsx`
- Add worked-example, quick-test, and challenge coverage through the existing seams.

## Setup / Save / Compare

- Add featured setups only when exact-state reopening is genuinely useful.
- Recheck saved-setup behavior on setup-capable concepts.
- Recheck compare-save behavior only on concepts where compare is a real teaching move.
- Keep `state`, `experiment`, and `challenge` precedence aligned with [platform-stability-checklist.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/platform-stability-checklist.md).

## Verification

- `pnpm validate:content`
- `pnpm content:doctor`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`

## Browser Sanity

- `/start`
- `/search`
- one subject page touched by the wave
- one new concept route
- one setup-capable concept if applicable
- one compare-save concept if applicable
- `/account/setups`
- `/account/compare-setups`
