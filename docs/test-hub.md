# Test Hub

The public Test Hub lives at `/tests`.

It now lists three published test kinds:

- cross-topic packs at `/tests/packs/[slug]`
- topic tests at `/tests/topics/[slug]`
- concept tests at `/tests/concepts/[slug]`

The hub remains a thin catalog surface. It does not invent a second content graph or a second quiz engine.

The hub now has three layers:

- personalized suggested tests
- guided testing tracks
- the full published test catalog

## Source Of Truth

Published concept tests still come from the live concept loader plus the shared concept-quiz seam:

- concepts come from `getAllConcepts()`
- quiz support comes from `hasConceptQuizSupport()` / `resolveConceptQuizDefinition()`
- concept test ordering comes from `lib/test-hub/catalog.ts`
- the test-first standalone entry route is `/tests/concepts/[slug]`
- the inline concept-page quick test still lives at `/concepts/[slug]#quick-test`

Published topic tests are built from the real published topic structure:

- topics come from `getTopicDiscoverySummaries()`
- included concepts are the published concepts already resolved into each topic summary
- topic test assembly and validation live in `lib/test-hub/topic-tests.ts`

Published cross-topic packs are built from the real published subject and topic structure:

- subjects come from `getSubjectDiscoverySummaries()`
- packs use explicitly authored included-topic lists from `content/catalog/test-packs.json`
- pack assembly and validation live in `lib/test-hub/packs.ts`

The public hub only shows published content. Draft and author-preview content does not leak into `/tests`.

## Concept Test Routes

Concept tests now have two supported public surfaces:

- standalone test page: `/tests/concepts/[slug]`
- inline concept-page quick test: `/concepts/[slug]#quick-test`

Test-oriented navigation uses the standalone route:

- concept cards in the Test Hub
- personalized concept suggestions
- guided testing tracks when the next step is a concept test
- concept-to-concept continuation from the test flow

Learning-content navigation still points at the concept page:

- `Review concept`
- concept-page inline quick test entry
- other general discovery and review surfaces that intentionally keep users inside the concept page shell

The `phase=check` query is not the canonical public generator for either concept-test surface. It remains deep-link compatible for the shared concept-phase shell, but new public concept-test links should not manufacture `?phase=check` themselves.

## Personalized Suggested Tests

The suggestion engine is rule-based and explainable. It does not use opaque scoring.

Current signal inputs come from the existing local-first plus synced progress snapshot:

- concept-page visits and last activity timestamps from concept progress records
- concept quick-test started and completed timestamps
- topic-test started and completed timestamps
- pack started and completed timestamps
- authored concept relationships already present in the content system:
  - `recommendedNext`
  - `prerequisites`
  - `related`
  - topic-local concept order from topic summaries

Current ranking buckets, in order:

1. assessments started but not completed
2. concept tests for recently studied concepts that still have no finished test
3. next concept tests in the same topic after recent study or recent concept completion
4. related concept tests grounded in the authored read-next graph
5. topic-test milestone suggestions after enough concept-test progress in a topic
6. pack suggestions after a relevant topic test is completed
7. starter suggestions from the published subject and topic order when there is not enough saved activity to personalize honestly

Each suggestion carries an explicit reason label such as:

- `Continue from your recent test activity`
- `Based on concepts you studied recently`
- `Next in <topic>`
- `Related to <concept>`
- `Milestone for <topic>`
- `Next after <topic> milestone`
- `Starter pick from the published order`

The hub now distinguishes two different unfinished states:

- `Resume test` means an exact local resumable session exists and the app can restore the current round, selected answers, retry-only subset, and generated question instances.
- `Continue this test path` means the assessment was started before, but there is no valid resumable session snapshot to restore exactly.

Personalized suggestions and guided tracks prefer true `Resume test` affordances over generic continue-path wording when a valid resumable session exists.

## Guided Testing Tracks

Guided testing tracks are fixed structured paths. They are not personalized.

Source of truth:

- topic order comes from `getTopicDiscoverySummaries()`
- concept order inside a topic comes from each topic summary's ordered `concepts`
- the topic-test milestone comes from the published topic-test catalog entry for that topic
- the follow-on pack comes from the first published pack that explicitly includes that topic

Each guided topic track follows this shape:

1. concept tests in the topic's published learning order
2. the topic test as the milestone assessment
3. the first relevant cross-topic pack containing that topic, when one exists

The current next item is always the first incomplete step in that ordered sequence.

If a step has a valid resumable session, the track uses `Resume test`.

If it was only started without an exact session snapshot, the track keeps the honest `Continue this test path` wording instead of implying saved answer-state restore.

## Topic Tests

Topic tests are first-class tests, not fake labels over concept quizzes.

Current rules:

- each shipped topic test contains 10-20 questions
- each shipped topic test must draw from multiple concepts in the topic
- one concept cannot dominate the run
- duplicate canonical questions are rejected
- each shipped topic test must include at least one explicit `bridge` question
- concept-backed questions come from the existing shared concept quiz session builder
- topic tests inherit the published zero-fallback guarantee because they only compose from published concept quiz sessions

The topic builder uses a deterministic round-robin selection across the topic's published concept order, with a per-concept cap derived from the target question count. The explicit bridge questions provide the cross-concept checks.

If a topic cannot meet the quality bar, it is excluded from the public topic-test catalog instead of being half-shipped.

## Cross-Topic Packs

Cross-topic packs are the first layer above topic tests.

They connect multiple topics inside the same subject and are intentionally stricter than topic tests.

Current rules:

- each shipped pack contains 10-20 questions
- each shipped pack must draw from multiple topics within one subject
- one topic cannot dominate the run
- one concept cannot dominate the run
- duplicate canonical questions are rejected
- each shipped pack must include at least two explicit `bridge` questions
- concept-backed questions come directly from the underlying published concept quiz sessions, not by concatenating topic tests
- packs inherit the published zero-fallback guarantee because they only compose from published concept quiz sessions

The current pack builder uses:

- subject order from `getSubjectDiscoverySummaries()`
- included topic lists from `content/catalog/test-packs.json`
- deterministic topic-level round robin
- a per-topic cap and a per-concept cap

This keeps packs broad enough to feel cross-topic without turning them into a grab bag of one dominant topic.

If a subject cannot support a coherent 10-20 question pack with at least two real cross-topic bridge questions, it is excluded from the public pack catalog and reported explicitly in pack audit tests.

## Pack And Topic Authoring

Topic-authored questions live in `content/catalog/topic-tests.json`.

Every shipped topic test now needs at least one explicit `bridge` question there.

Pack-authored questions live in `content/catalog/test-packs.json`.

Every shipped pack now needs at least two explicit `bridge` questions there.

Current pack authoring shape:

```json
[
  {
    "slug": "physics-connected-models",
    "subjectSlug": "physics",
    "title": "Physics Connections Pack",
    "summary": "Connect motion, oscillation, wave behavior, and orbital reasoning across one compact physics assessment.",
    "includedTopicSlugs": [
      "mechanics",
      "oscillations",
      "waves",
      "gravity-and-orbits"
    ],
    "questionCount": 16,
    "questions": [
      {
        "id": "orbit-as-continuous-fall",
        "kind": "bridge",
        "type": "reasoning",
        "relatedTopicSlugs": [
          "mechanics",
          "gravity-and-orbits"
        ],
        "relatedConceptSlugs": [
          "uniform-circular-motion",
          "gravitational-fields",
          "circular-orbits-orbital-speed"
        ],
        "authorNote": "Connects circular-motion mechanics to gravitational orbit reasoning.",
        "prompt": "...",
        "choices": [
          { "id": "a", "label": "..." },
          { "id": "b", "label": "..." }
        ],
        "correctChoiceId": "a",
        "explanation": "..."
      }
    ]
  }
]
```

Guidelines for pack authoring:

- keep `slug` aligned with the public route slug for the pack
- keep `subjectSlug` aligned with a real published subject slug
- include at least two `includedTopicSlugs`
- mark genuine cross-topic questions with `kind: "bridge"`
- bridge questions must reference at least two `relatedTopicSlugs` from the same pack
- optionally add `relatedConceptSlugs` when the bridge question depends on concrete concepts inside those topics
- do not use authored bridge questions as filler; they should earn the claim of cross-topic reasoning
- if a subject cannot support real bridge questions, exclude the pack instead of shipping a weak placeholder

## Runtime Surfaces

Concept tests now have a focused standalone runtime and an inline concept-page runtime:

- the standalone page at `/tests/concepts/[slug]` is the test-first assessment surface
- the inline concept-page quick test at `/concepts/[slug]#quick-test` remains part of the learning surface

Topic tests and packs have dedicated routes, but they both reuse the same shared quiz runner flow:

- full first round
- separate `Try Again` round with only missed questions
- stable generated question instances within the same attempt
- fresh generated values on a new attempt

The pack page keeps clear paths back to learning content:

- review the subject page
- jump to the included topics section
- open each included topic
- continue to the next pack

## Exact Resume Sessions

Exact resumable assessment sessions are now supported for:

- concept tests on both `/tests/concepts/[slug]` and `/concepts/[slug]#quick-test`
- topic tests on `/tests/topics/[slug]`
- packs on `/tests/packs/[slug]`

The persisted local session layer lives in `lib/assessment-sessions/*` and stores resumable state under the local-first browser key:

- `open-model-lab.assessment-sessions.v1`

Each saved session snapshot includes:

- assessment kind plus stable assessment id
- locale and canonical public route
- definition key used to invalidate stale sessions safely
- created / updated timestamps
- exact instantiated question instances
- current round and current question index
- selected answers for the active round
- retry-round state and missed-question subset when applicable

This makes `Resume test` truthful for generated assessments too:

- the same generated question instances reappear
- the same givens and values reappear
- the same selected answers remain selected
- the same retry-only round comes back if the user had already entered `Try Again`

Concept tests use one shared assessment identity across both surfaces:

- start on the standalone page and resume on the concept page
- start on the concept page and resume on the standalone page
- complete on one surface and see the same completion state on the other

The concept assessment descriptor intentionally stays surface-agnostic. The two concept routes are different entry points into the same assessment identity, not separate progress tracks.

## Session Lifecycle

Local resumable session state is written when the assessment meaningfully changes:

- on the first answered question
- on later answer changes
- when the runner advances to the next question
- when the retry round is created
- when a `Show in simulation` action changes the active runner state

Local resumable session state is cleared when it should no longer be resumable:

- after full assessment completion
- after an explicit retake / restart
- when a stored session no longer matches the current assessment definition

If the stored session is stale or incompatible, the app discards it safely and falls back to either:

- a fresh start, or
- the existing non-resumable `Continue this test path` state if only the started-at signal remains

## Progress And Completion State

The hub, topic-test pages, and pack pages all use the merged local/synced progress model instead of disconnected assessment stores.

Concept-test progress still comes from concept records:

- `completedQuickTestAt`
- `quickTestAttemptCount`
- `quickTestLastIncorrectCount`

Topic-test progress lives under `topicTests[slug]`:

- `completedAt`
- `attemptCount`
- `lastIncorrectCount`
- `lastQuestionCount`

Pack progress now lives under `packTests[slug]`:

- `completedAt`
- `attemptCount`
- `lastIncorrectCount`
- `lastQuestionCount`

The UI only claims what is actually stored:

- not started
- started but not finished, when an assessment has a newer started-at signal than its last completed-at signal
- resumable in progress, when a valid exact local session snapshot exists
- completed at least once
- latest saved result

The canonical progress snapshot and the local resumable-session snapshot stay separate on purpose:

- progress records power completion history, recommendations, and guided tracks
- resumable session snapshots power exact in-progress restore on the same browser

This first pass is local-first only. It does not claim cross-device synced resume.

## Hydration Honesty

The Test Hub does not pretend the server already knows local-only activity.

Current rules:

- personalized suggestions stay in a neutral loading state until local progress is hydrated
- `Resume test` affordances stay behind the same readiness boundary as the local resumable-session store, so the hub does not flash fake `Resume` or fake `No resume available` states
- the general concept/topic/pack catalog cards also wait on that same readiness boundary before collapsing an incomplete assessment into `Not started`
- the standalone concept-test saved-result panel follows that same readiness rule before claiming `Resume available`, `Started`, or `Not started`
- topic-test and pack saved-result side panels treat resumable in-progress sessions as a distinct visible state instead of calling them `Not started`
- guided testing tracks can render their published structure immediately, but their progress-driven next-step state stays behind the same readiness boundary
- the summary strip, published catalog cards, suggested tests, and guided-track progress all wait for the same local-progress readiness signal before claiming merged truth
- signed-in pages may start with a synced server snapshot, but the UI avoids presenting that as final truth until the local snapshot is ready to merge
- stale or incompatible resumable sessions do not surface `Resume test`; they fall back to loading or non-resumable started-state UI until the runner discards them safely

## Ordering

Concept-test continuation still prefers the next published concept test in the same topic before falling forward globally.

Topic-test continuation now prefers:

1. the next published topic test later in the same subject
2. otherwise the next published topic test in stable global topic order

Pack continuation now prefers:

1. the next published pack later in the same subject, if more than one ever exists
2. otherwise the next published pack in stable subject order

## Shipped Vs Excluded Packs

This first pass prefers one canonical public pack per subject, but only when the subject can meet the quality bar.

Current public pack shape:

- Physics pack ships
- Math pack ships
- Chemistry pack ships
- Computer Science is excluded because it currently has only one published topic, so it cannot honestly support a cross-topic pack yet

That exclusion is asserted in pack audit tests instead of being silently omitted.

## Future Work

The public catalog now ships:

- `kind: "pack"`
- `kind: "topic"`
- `kind: "concept"`

Multi-subject packs are intentionally out of scope for now. The current catalog/runtime seams leave room for future expansion, but this pass only supports cross-topic packs within a single subject.
