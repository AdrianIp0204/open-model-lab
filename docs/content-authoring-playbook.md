# Open Model Lab Content Authoring Playbook

Use this when adding or expanding concepts inside the existing subject graph.

## Canonical Workflow

1. Start with the scaffold:
   - `pnpm scaffold:concept -- --slug your-slug --title "Your Title" --subject "Math" --topic "Functions" --simulation-kind graph-transformations`
2. Fill the scaffolded concept metadata first.
   - `content/catalog/concepts.json` is the source of truth for subject, topic, difficulty, sequencing, and read-next identity.
3. Fill the rich concept content next.
   - `content/concepts/*.json` owns teaching copy, worked examples, quick test, challenge mode, presets, overlays, graphs, and featured setups.
4. Reuse an existing simulation kind when the interaction grammar already exists.
5. Introduce a new simulation kind only when the concept genuinely needs a new live bench.

## When To Extend Topics, Tracks, And Goal Paths

- Extend an existing topic page when the new concept clearly fits an existing canonical topic label.
- Add a new topic page only when the learner needs a distinct public landing slice, not just another concept row.
- Extend a starter track when the new concept belongs in a clear ordered path that already exists.
- Add a new starter track only when there is a bounded, authored sequence worth following end to end.
- Add or extend a recommended goal path only when the new content changes a real learner objective or teacher-facing route, not just because the concept exists.

## Exact-State And Compare Guidance

- Add featured exact-state setups when the learner-facing state is stable, compact, and worth reopening later.
- Skip featured setups when the concept is mostly explanatory or when the live state is too incidental to share meaningfully.
- Compare-save is worth it when A/B scenes are a real part of the concept, not just because compare mode exists globally.
- If compare mode is not a real teaching affordance for the concept, keep the concept in normal exact-state/save flows and do not force compare-specific authoring.

## Integration Checks Before Calling A Content Wave Done

Run these commands:

- `pnpm validate:content`
- `pnpm content:doctor`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`

Then do a small browser check against the current stability matrix in [platform-stability-checklist.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/platform-stability-checklist.md), plus the new concept/topic/track routes you touched.

## What The Doctor Is For

`pnpm content:doctor` is the higher-level content-wave report. Use it to catch:

- subject/topic/track/goal-path coherence issues
- malformed featured setup wiring
- stale discovery copy assumptions
- cross-surface integration mistakes that schema validation alone will not catch

It does not replace `pnpm validate:content`. Run both.
