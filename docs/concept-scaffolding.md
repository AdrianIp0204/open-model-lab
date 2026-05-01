# Open Model Lab Concept Scaffolding

The repository now includes a lightweight scaffold CLI for new concept authoring:

```bash
pnpm scaffold:concept -- --slug electric-dipole --title "Electric Dipole" --subject Physics --topic Electricity --simulation-kind electric-fields --write
```

The scaffold is intentionally local and file-based. It does not register anything in the live catalog until you move the generated files into the canonical paths yourself.

## What It Generates

By default the command writes to `output/concept-scaffolds/<slug>/`:

- `catalog-entry.json`
- `concept-content.json`
- `README.md`

`catalog-entry.json` mirrors the canonical metadata shape used by `content/catalog/concepts.json`, including the read-next fields (`prerequisites`, `related`, `recommendedNext`) and local-first progress identity (`id`, `slug`, `contentFile`).

`concept-content.json` mirrors the rich-content shape used by `content/concepts/*.json`, including:

- shared concept-page sections
- quick-test placeholders
- challenge-mode placeholders
- prediction-mode placeholder
- notice-prompt placeholder
- accessibility / SEO placeholders

## Template Modes

The command has two bounded modes.

### 1. Auto-seeded scaffold

If you pass a known `--simulation-kind`, the script looks for an existing concept with the same simulation kind and seeds the scaffold from that concept's controls, presets, overlays, graphs, equations, and variable links.

That is the fastest path when the new concept should reuse an existing simulation/runtime seam.

### 2. Blank scaffold

Use `--blank` when you want the smallest generic template instead of seeding from an existing concept:

```bash
node scripts/scaffold-concept.mjs --slug template-check --title "Template Check" --topic Mechanics --simulation-kind projectile --blank --write
```

This is useful when you only want the canonical metadata/content shape or when you plan to introduce a brand new simulation kind.

## Recommended Workflow

1. Generate the scaffold locally.
2. Review `catalog-entry.json` first and replace the metadata TODOs.
3. Review `concept-content.json` and replace the teaching-copy TODOs.
4. Replace `replace-with-live-worked-example-id` and add or update the matching runtime builder in `lib/learning/liveWorkedExamples.ts`.
5. If you are reusing an existing simulation kind, keep the scaffold ids aligned with the existing control / graph / preset / overlay seams.
6. If you are introducing a new simulation kind, wire it through:
   - `lib/content/schema.ts`
   - `lib/content/loaders.ts`
   - `lib/physics/index.ts`
   - `components/simulations/ConceptSimulationRenderer.tsx`
   - the new physics helpers, simulation component, and focused tests
7. Move the filled-in files into:
   - `content/catalog/concepts.json`
   - `content/concepts/<contentFile>.json`
8. Run the full repo validations:
   - `pnpm content:doctor`
   - `pnpm lint`
   - `pnpm exec tsc --noEmit`
   - `pnpm test`
   - `pnpm build`

## Guardrails

- The scaffold is intentionally lightweight. It reduces setup friction without adding a new generator framework or a build step.
- The scaffold does not bypass the existing canonical validation rules. The live catalog and content loaders remain authoritative.
- Local-first progress still comes from the canonical concept slug and id once the concept is registered in the real catalog.
- Pair this with [content-authoring-playbook.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/content-authoring-playbook.md) and [content-wave-checklist.md](C:/Users/dream/OneDrive/Desktop/.physica/docs/content-wave-checklist.md) when you are planning a larger content wave.
