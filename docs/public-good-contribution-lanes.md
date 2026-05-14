# Public-Good Contribution Lanes

Open Model Lab is a public-source, simulation-first STEM learning lab. The goal is not to become a generic wiki, course-card site, or monetization funnel. The strongest contribution moves a student from passive reading toward seeing, predicting, testing, and explaining a concept.

## Good First Contribution Lanes

### Concept corrections

Useful examples:

- fix a wrong definition, unit, sign convention, graph label, or worked example;
- add a missing caveat that prevents a common misconception;
- improve a short explanation without changing the page structure.

Keep these small and cite the source or reasoning in the issue/PR.

### Simulation and interaction polish

Useful examples:

- make a slider/readout easier to understand;
- improve keyboard or screen-reader access;
- fix dark/light contrast;
- add a clearer prompt for “predict → change → observe → explain”.

Do not invent a one-off page pattern if the shared concept-page framework can handle the improvement.

### Student-facing copy and localization

Useful examples:

- simplify dense wording;
- make instructions more direct;
- improve zh-HK copy while preserving IDs, slugs, storage keys, and route identities;
- replace vague motivational copy with concrete next actions.

### Tests and content validation

Useful examples:

- add a regression test for a route, component, content schema, or simulation control;
- tighten content validation when an error pattern repeats;
- reduce noisy passing test output without weakening coverage.

### Documentation for contributors

Useful examples:

- clarify local setup without vendor accounts;
- explain how to author a concept correction;
- document a shared simulation seam;
- improve issue triage notes.

## Owner-Decision Lanes

Open an issue or discussion before working on:

- new large simulations, subjects, tools, or content systems;
- account/auth/session/sync behavior;
- database migrations;
- Stripe, Supporter billing, webhooks, entitlement gates, or internal `free | premium` values;
- ad policy, AdSense placement, or `ads.txt`;
- AI features, external APIs, or anything with ongoing cost;
- license, brand, trademark, governance, or security-policy changes;
- major visual redesigns.

## Non-Goals

Avoid contributions that push Open Model Lab toward:

- a generic notes wiki with no interaction;
- a video/course directory;
- childish gamification detached from concepts;
- paywalling basic understanding;
- copying private operator setup or official brand deployment details;
- broad rewrites without a clear student-facing improvement.

## Recommended First Issues

These are good initial issue seeds when the repo is public:

1. `docs(readme): align public-source positioning for the renewed OML direction`
2. `docs(setup): add no-vendor local contributor quickstart`
3. `chore(repo): add Node version and engines metadata`
4. `chore(hygiene): allowlist private-route-metadata test filename in public-release scan`
5. `test: reduce expected-error noise in public Vitest output`
6. `docs(roadmap): define public-good contribution lanes and owner-decision boundaries`
7. `content: audit beginner-facing concepts for first good-first-issue corrections`
8. `infra: add or confirm redacted secret-scan CI before public contribution intake`

As fixes land, replace this list with real GitHub issues and keep the README pointing at current labels/templates instead of stale local notes.
