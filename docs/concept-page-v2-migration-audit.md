# Concept Page V2 Migration Audit

_Last updated: 2026-04-18_

## Coverage snapshot

- Published concepts: `97`
- Explicit authored V2 concepts: `19`
- Fallback-derived V2 concepts: `78`

## By subject

| Subject | Published | Authored V2 | Fallback V2 |
| --- | ---: | ---: | ---: |
| Physics | 66 | 8 | 58 |
| Math | 16 | 4 | 12 |
| Chemistry | 9 | 3 | 6 |
| Computer Science | 6 | 4 | 2 |

## Authored V2 concepts

- Physics: `simple-harmonic-motion`, `wave-speed-wavelength`, `torque`, `momentum-impulse`, `circular-orbits-orbital-speed`, `rotational-inertia`, `angular-momentum`, `rolling-motion`
- Math: `graph-transformations`, `derivative-as-slope-local-rate-of-change`, `integral-as-accumulation-area`, `complex-numbers-on-the-plane`
- Chemistry: `concentration-and-dilution`, `solubility-and-saturation`, `acid-base-ph-intuition`
- Computer Science: `binary-search-halving-the-search-space`, `graph-representation-and-adjacency-intuition`, `breadth-first-search-and-layered-frontiers`, `depth-first-search-and-backtracking-paths`

## This tranche

This pass migrated these fallback concepts to explicit authored V2 lessons:

- Physics: `torque`, `wave-speed-wavelength`, `momentum-impulse`
- Math: `derivative-as-slope-local-rate-of-change`, `integral-as-accumulation-area`
- Chemistry: `concentration-and-dilution`, `solubility-and-saturation`
- Computer Science: `graph-representation-and-adjacency-intuition`, `breadth-first-search-and-layered-frontiers`, `depth-first-search-and-backtracking-paths`

## Flagship follow-up

This pass also migrated one especially rich fallback concept into an explicit flagship V2 lesson:

- Physics: `rotational-inertia`

Why this route:

- It already had unusually strong page-intro, worked-example, prediction, challenge, quick-test, and accessibility assets.
- It was the route that recently exposed the math-rendering and explicit challenge-mode visibility concerns, so it was a high-value proof point for authored V2 quality.
- It is a mechanics concept where fallback was usable but too generic relative to the bench and teaching assets already present in the file.

## Mechanics family completion

This pass also migrated the two strongest fallback mechanics neighbors around the authored `torque` and `rotational-inertia` branch:

- `angular-momentum`
- `rolling-motion`

Why these routes:

- `angular-momentum` is the cleanest follow-on from both `torque` and `rotational-inertia`, because it turns rotational cause-and-effect into a conserved quantity.
- `rolling-motion` is the strongest applied continuation from `rotational-inertia`, because the same mass-distribution story now changes a visible downhill race.
- Together they create an authored mechanics cluster instead of handing learners back into fallback after `torque` or `rotational-inertia`.

Why these concepts:

- They are foundational enough that fallback guidance leaves too much value on the table.
- Their existing authored content already had strong page-intro, quick-test, worked-example, and simulation-id material to support explicit V2 lessons.
- Together they widen V2 coverage across all four live subjects instead of clustering the rollout in one lane.

## Remaining highest-priority fallback concepts

The next wave should favor concepts that are either foundational entry points or strong family completions next to the newly authored tranche:

- Physics: `projectile-motion`, `vectors-components`, `temperature-and-internal-energy`, `wave-interference`, `static-equilibrium-centre-of-mass`
- Math: `vectors-in-2d`, `limits-and-continuity-approaching-a-value`, `optimization-maxima-minima-and-constraints`
- Chemistry: `dynamic-equilibrium-le-chateliers-principle`, `buffers-and-neutralization`, `reaction-rate-collision-theory`
- Computer Science: `sorting-and-algorithmic-trade-offs`, `frontier-and-visited-state-on-graphs`

## Repeated migration gaps

- `pageIntro.whyItMatters` is still missing on most fallback concepts, so the top-level learner framing usually has to be authored during migration.
- Only a small minority of fallback concepts have `simulation.ui.starterExploreTasks`, so the first guided step often needs to be written from worked examples or key ideas instead of lifted from an existing starter prompt.
- Several fallback concepts still have only one worked example or two quick-test questions, which limits how richly `inlineCheck` can be authored without touching the underlying lesson content.
- The authoring contract is explicit by design: every migrated concept still has to wire real `controlIds`, `graphIds`, `overlayIds`, presets, and question ids. That keeps the lessons honest, but it means migrations should stay deliberate and bounded.

## Recommended migration order

1. Finish foundational entry concepts that still open on fallback.
2. Fill in family adjacencies around already-authored V2 concepts.
3. Prefer concepts that already have at least one worked example, one prediction, and one quick-test question.
4. Leave thinner content for later waves unless a product need makes them urgent.
