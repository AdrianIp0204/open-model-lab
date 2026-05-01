# Offline Editorial Content Workflow

This repo supports an offline AI-assisted editorial workflow without any runtime dependency on Gemini, OpenAI, or other networked LLM APIs.

English remains canonical. Optimized English and localized content are optional overlay variants that are stored in-repo, validated at build time, and resolved deterministically at runtime.

## Source Layout

Canonical English source of truth:

- `content/catalog/*.json`
- `content/concepts/*.json`

Optional optimized English overlays:

- `content/optimized/concepts/<slug>.json`

Optional localized concept overlays:

- `content/i18n/<locale>/concepts/<slug>.json`

Manual editorial metadata:

- `content/_meta/editorial-manifest.json`

Generated runtime and status artifacts:

- `content/_meta/generated/concept-variant-manifest.json`
- `content/_meta/generated/optimized-concepts.json`
- `content/_meta/generated/optimized-concept-ui-copy.json`
- `lib/content/generated/content-variants.ts`
- `lib/content/generated/content-variant-ui.ts`

## Variant Model

Concept variants are partial overlays, not full duplicate concept files.

- Canonical English: the original content in `content/catalog/*` and `content/concepts/*`
- Optimized English: optional teaching-copy improvements layered over canonical English
- Localized: optional locale overlays layered over the best available English base

Rich concept resolution lives in `lib/i18n/concept-content.ts` and exposes:

- `resolveConceptContentVariant(concept, locale)`
- `resolveConceptContentBySlug(slug, locale)`
- `resolveConceptContentById(id, locale)`

Lightweight concept-card and catalog display helpers live in `lib/i18n/content.ts`. Keep route and client display imports there unless you need the full resolved concept body.

Each resolver call returns resolved content plus metadata describing:

- requested locale
- resolved locale
- resolved variant
- source file used
- canonical source file
- hashes
- review and QA status
- derived-from provenance
- fallback chain
- whether any localized fields fell back to English
- fallback field counts and sampled fallback field paths

## Fallback Order

For `en` requests:

1. optimized English overlay if present and usable
2. canonical English

For non-`en` requests such as `zh-HK`:

1. localized overlay for that locale if present and usable
2. optimized English overlay if present and usable
3. canonical English

If a higher-priority overlay exists but is invalid or unusable, the resolver records the failure in metadata and safely falls through to the next candidate.

When a localized overlay is selected, any still-untranslated fields inherit from optimized English when it exists and is usable; otherwise they inherit from canonical English.

## Overlay Safety And Merge Rules

Optimized and localized concept files are editorial overlays, not arbitrary partial JSON patches.

- Only allowlisted user-facing editorial fields are mergeable.
- Stable identity and structural fields stay canonical.
- Protected fields are ignored and reported; they are not applied silently.

Protected fields include at minimum:

- ids and slugs
- anchors and schema/shape keys
- internal references and route-like identifiers
- simulation kind/config fields
- formulas, LaTeX, protected tokens, placeholders, and code-like markers
- URLs
- other non-editorial structural fields

Array merge behavior is deterministic:

- Arrays of objects merge only when every item carries a stable `id` or `slug`.
- When those stable identity keys are absent, the overlay array replaces the canonical array wholesale.
- When an overlay array is absent, the canonical array is preserved.
- There is no positional element-by-element array merging for unlabeled arrays.

Generated status output reports ignored protected paths so incomplete or unsafe overlays are visible during review.

For optimized English overlays, ignored protected or unsupported paths are treated as validation errors rather than harmless notes. Optimized overlays must only contain live editorial fields.

## Provenance And Staleness

The generated manifest tracks a canonical content hash per concept based on the translatable overlay subset used by the editorial pipeline.

Derived variants track:

- the base variant they were derived from: `original` or `optimized`
- the recorded source hash at derivation time
- the current source hash for that base
- whether the derived file is stale

Locale overlays reuse the existing locale manifest under `content/i18n/<locale>/manifest.json` when available. Optimized overlays use `content/_meta/editorial-manifest.json` for review, QA, notes, provider, and optional provenance overrides.

Stale content is still loadable if the overlay itself is structurally usable. Staleness is a review signal, not an automatic runtime failure.

Localized overlays can inherit missing fields from optimized English at runtime without being marked stale against optimized English by default. Stale detection follows the explicit provenance chain:

- if `derivedFrom.variant` is `original`, stale checks compare against canonical English
- if `derivedFrom.variant` is `optimized`, stale checks compare against optimized English

If a locale overlay intentionally depends on optimized English copy and should become stale when optimized English changes, set `derivedFrom.variant` to `optimized`. When runtime fallback uses optimized English but provenance still points at canonical English, the manifest records that with fallback metadata and a note.

## Review And QA Metadata

Supported review statuses:

- `draft`
- `ai-generated`
- `human-reviewed`
- `approved`

Supported QA statuses:

- `unknown`
- `pass`
- `warning`
- `fail`

Use `content/_meta/editorial-manifest.json` to override or annotate optimized/localized variants without editing generated files.

## Adding Optimized English

1. Keep canonical English in place.
2. Add a partial overlay file at `content/optimized/concepts/<slug>.json`.
3. Optionally add metadata under `content/_meta/editorial-manifest.json`:
   - `reviewStatus`
   - `qaStatus`
   - `notes`
   - `issues`
   - `provider`
   - `translatedAt`
   - `derivedFrom`
4. Run:
   - `pnpm content:registry`
   - `pnpm content:variants:status`
   - `pnpm content:variants:validate`

Optimized overlays must preserve canonical `{{...}}` live placeholders within edited fields. Dropping or changing those tokens makes the optimized overlay invalid and removes it from the generated optimized bundle until fixed.

Do not copy the full canonical concept into the optimized file unless the entire translatable surface is intentionally being replaced.

An empty `{}` optimized overlay is treated as a checked-in no-op placeholder. It is reported in status output but skipped at runtime.

## Adding Localized Content

1. Keep canonical English in place.
2. Add or update the locale overlay at `content/i18n/<locale>/concepts/<slug>.json`.
3. If the locale pipeline generated or updated `content/i18n/<locale>/manifest.json`, keep that file checked in because it carries provenance and staleness inputs.
4. If you need review or QA overrides beyond the locale manifest, add them in `content/_meta/editorial-manifest.json`.
5. Run:
   - `pnpm content:registry`
   - `pnpm content:variants:status`
   - `pnpm content:variants:validate`
   - `pnpm i18n:validate -- --locale <locale>`

## Validation And Status Commands

- `pnpm content:registry`
  Regenerates the content registry, locale bundle, optimized bundle, optimized UI-copy bundle, and concept variant manifest.

- `pnpm content:variants:status`
  Prints a readable summary of optimized/localized coverage, invalid overlays, stale variants, and localized fallback usage. Optimized overlays with ignored protected paths or placeholder-token loss show up here as errors.

- `pnpm content:variants:validate`
  Fails if the generated report contains structural variant errors, including optimized overlays that contain ignored protected or unsupported paths or that change canonical `{{...}}` placeholder tokens.

- `pnpm i18n:validate -- --locale zh-HK`
  Validates locale overlay integrity against the translation tooling expectations.

Generated artifact lifecycle:

- `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm test`, `pnpm validate:content`, `pnpm preview`, `pnpm deploy`, and `pnpm upload` already regenerate the content artifacts through existing `pre*` hooks.
- Generated runtime imports also include guardrails that throw a clear `Run \`pnpm content:registry\`` error if a required artifact is missing or malformed.
- For CI or editor review, the smallest deterministic content-variant flow is:
  - `pnpm content:registry`
  - `pnpm content:variants:validate`
  - `pnpm i18n:validate -- --locale <locale>` when locale overlays changed

## Catalog Parity

Concept card/listing surfaces already consume the lightweight localized and optimized concept UI-copy bundle through `lib/i18n/content.ts`, so concept summaries stay aligned with the rich concept resolver.

Broader catalogs remain on the existing model:

- subject/topic/starter-track/guided/goal-path localization comes from `content/i18n/<locale>/catalog/*`
- optimized English overlays are currently concept-only

Catalog-wide optimized English overlays are intentionally out of scope for now. Do not introduce a second catalog variant system casually.

## What Not To Change Casually

- Do not hand-edit:
  - `content/_meta/generated/*`
  - `lib/content/generated/content-variants.ts`
  - `lib/content/generated/content-registry.ts`
  - `lib/i18n/generated/content-bundle.ts`
- Do not move canonical English out of `content/catalog/*` or `content/concepts/*`.
- Do not introduce runtime AI calls or network-based translation/optimization.
- Do not create a second route-local content resolver.
- Do not create full duplicate concept trees when a partial overlay is sufficient.
