# Open Model Lab Concept Metadata

`content/catalog/concepts.json` is the canonical concept catalog. It is the single source of truth for concept metadata and learning-path relationships.

The UI should consume selectors from `lib/content/`, not hardcoded topic lists, route lists, or recommendation rules.

## Topic Landing Catalog

`content/catalog/topics.json` is the bounded authoring layer for first-class topic landing pages.

Each topic row owns:

- `id`
- `slug`
- `title`
- `description`
- `introduction`
- `sequence` optional
- `conceptTopics`: canonical concept-topic labels that feed the page
- `featuredConceptSlugs`: clear best-first concepts for the page header and directory cards
- `conceptGroups`: authored grouped-overview sections with `id`, `title`, optional `description`, and ordered `conceptSlugs`

This file does not replace concept metadata. It references the canonical concept catalog and builds compact public-preview topic pages from it.

## Starter Track Catalog

`content/catalog/starter-tracks.json` is the canonical authoring layer for starter tracks.

Each track row owns:

- `id`
- `slug`
- `title`
- `summary`
- `introduction`
- `sequenceRationale`
- `sequence` optional
- `accent`
- `highlights`
- `conceptSlugs`: authored concept order for the shared track framework, with one or more concept steps
- `checkpoints` optional: compact guided-path moments that reuse existing concept challenge entries
- `entryDiagnostic` optional: compact placement guidance that reuses existing concept quick tests and checkpoint challenges at the track entry instead of inventing a second assessment system
- `recommendedNextTrackSlugs` optional: direct follow-on track hints when the completion surface should point somewhere more specific than plain catalog order
- `prerequisiteTrackSlugs` optional: compact track-to-track prerequisite hints for future topic or track suggestions without introducing a separate prerequisite engine

Each checkpoint row owns:

- `id`
- `title`
- `summary`
- `afterConcept`: the concept slug after which the checkpoint appears in the authored path
- `conceptSlugs`: the earlier in-track concepts that the checkpoint is meant to synthesize
- `challenge`: `{ conceptSlug, challengeId }` pointing at an already-authored challenge item on an existing concept page

Starter-track checkpoints are not a separate assessment engine. They are a canonical way to place bounded challenge moments into the existing track order while continuing to reuse the concept challenge catalog and the local-first progress model.

An `entryDiagnostic` row can include:

- `title`
- `summary`
- `probes`: 1-3 compact checks, each pointing at an existing concept `quick-test` or `challenge`
- `skipToConcept` optional: the later in-track concept that becomes the suggested re-entry when every probe is already satisfied

The runtime derives the recommendation from saved concept progress, quick-test history, checkpoint challenge solves, and existing prerequisite-track hints. It does not create a separate score store.

## Guided Collection Catalog

`content/catalog/guided-collections.json` is the canonical authoring layer for guided collections, lesson sets, and playlists.

Each collection row owns:

- `id`
- `slug`
- `format`
- `title`
- `summary`
- `introduction`
- `sequenceRationale`
- `educatorNote` optional
- `sequence` optional
- `accent`
- `highlights`
- `steps`: ordered concept, track, challenge, or surface steps that keep the collection inside existing public routes and product surfaces
- `entryDiagnostic` optional: compact placement guidance that reuses existing quick tests and challenge entry points before the collection opens fully

A guided-collection `entryDiagnostic` can include:

- `title`
- `summary`
- `probes`: 1-3 compact checks, each pointing at an existing concept `quick-test` or `challenge`
- `skipToStepId` optional: the later collection step that becomes the suggested re-entry when every probe is already satisfied

Guided-collection diagnostics stay lightweight on purpose. They reuse the same concept progress, starter-track progress, and challenge history already saved elsewhere in the product instead of introducing a separate lesson-assessment engine.

## Canonical Fields

Each catalog row supports:

- `id`: stable internal concept identifier
- `slug`: route slug
- `contentFile`: rich-content file key in `content/concepts/`
- `title`
- `shortTitle` optional
- `summary`
- `subject`
- `topic`
- `subtopic` optional
- `difficulty`
- `sequence` optional but recommended
- `tags` optional
- `prerequisites` optional
- `related` optional
- `recommendedNext` optional curated override list
- `published`
- `status` optional
- `estimatedStudyMinutes` optional
- `heroConcept` optional
- `accent`
- `highlights`
- `simulationKind`

## Metadata Ownership

Metadata in the catalog owns:

- concept identity
- route identity
- catalog listing data
- topic/subtopic grouping
- subject grouping
- difficulty and sequencing
- publish state
- read-next relationships
- summary-level display text
- simulation kind

Rich content files do not duplicate those fields.

The shared page-assembly rules live separately in [concept-page-framework.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/concept-page-framework.md).

## Read-Next Relationship Rules

Read-next resolution is data-driven:

1. `recommendedNext` curated overrides win first.
2. Same-topic progression and prerequisite/builds-on relationships fill gaps next.
3. Related or contrast concepts can be suggested afterward.
4. Unpublished concepts are excluded from surfaced recommendations.

The resolver lives in `lib/content/read-next.ts`, not in React components.

## Registry / Selector Layer

`lib/content/loaders.ts` builds the canonical registry and selectors:

- ordered published concepts
- all metadata entries
- metadata by `id`
- metadata by `slug`
- concepts by topic
- concepts by topic + subtopic
- published topic order
- catalog metrics

`lib/content/topics.ts` then builds the first-class topic landing pages from `content/catalog/topics.json`, the canonical concept summaries, and starter-track metadata. Topic landing validation fails if:

- topic ids or slugs are duplicated
- a referenced canonical `conceptTopics` label does not exist
- a canonical topic is assigned to multiple topic landing pages
- featured concepts fall outside the declared source topics
- concept groups duplicate or omit a concept that belongs to the page

Pages and components should use those selectors instead of inventing their own concept maps.

## Validation Rules

Catalog validation fails on:

- duplicate `id`
- duplicate `slug`
- duplicate `contentFile`
- broken prerequisite / related / recommended-next references
- self-references
- status / published mismatches
- unregistered content files
- missing content files

Starter-track validation also fails on:

- duplicate track ids or slugs
- duplicate concept slugs within a track
- prerequisite order violations inside a track
- duplicate checkpoint ids within a track
- checkpoints whose `afterConcept` is not in the track
- checkpoints that point at concepts outside the track or later than the checkpoint position
- checkpoints that point at challenge concepts outside the track or later than the checkpoint position
- checkpoints that reference missing challenge ids
- duplicate `recommendedNextTrackSlugs` / `prerequisiteTrackSlugs` values
- track-to-track references that point at missing starter tracks or back at the same track

Concept normalization then validates the merged catalog + rich-content record and catches broken internal references.

## Adding A New Concept

1. Add the metadata row to `content/catalog/concepts.json`.
2. Add the matching rich-content file in `content/concepts/`.
3. Make sure `contentFile` and `simulationKind` are correct.
4. Add or update focused tests if the new concept adds new metadata conventions.
5. Run the full verification commands.

## Spreadsheet-Friendly Design

The catalog file is intentionally row-shaped and source-agnostic:

- one concept per entry
- mostly scalar or list fields
- no UI-specific JSX logic embedded in the data
- separate rich-content files for long structured teaching content

That means a future spreadsheet export can target the same catalog schema without changing the UI consumers. The loader and registry builder are the seam, not the storage format.
