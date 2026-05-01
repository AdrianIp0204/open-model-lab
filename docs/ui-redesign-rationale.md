# UI redesign rationale

## What changed

This redesign shifts Open Model Lab toward a calmer, guided learning-platform structure without changing the underlying simulation runtime, content model, or progress system.

The shared layer changed first:

- softened the site-wide background so the product no longer sits on a noisy global grid
- raised the default readability floor with larger body text and stronger spacing rhythm
- introduced a smaller set of reusable surface patterns: hero surfaces, feature cards, list-row cards, filter panels, progress pills, and stronger CTA styles
- simplified the header to a smaller set of learning actions with a persistent start/continue action
- replaced the mobile section overlay pattern with a compact sticky section strip

The concept page changed most aggressively:

- removed the long concept-page rail from the main template
- moved the live lab ahead of the lower learning-phase scaffold
- kept the Explore -> Understand -> Check model, but turned it into a compact progress stepper with one visible active phase
- reduced the phase summary block so it frames the next task instead of competing with the simulation
- reorganized the simulation shell so the scene dominates first, controls stay nearby, guidance sits directly below the bench, and support surfaces fall later
- pushed worked examples, misconception correction, and accessibility text behind progressive disclosure

Discovery and pathway surfaces were tightened:

- the homepage now leads with one primary start action, one browse action, and an earlier continuation surface
- concept cards show fewer competing metadata elements and use stronger reading and CTA hierarchy
- the concept library and challenge browser now present filters more like grouped controls than chip clouds
- track overview surfaces use the same stronger hero/CTA hierarchy as the rest of the redesign

## Audit issues addressed

The redesign directly targets the major issues called out in the UI/UX audit:

- `Simulation buried on concept pages`: fixed by moving the live lab ahead of the phase scaffold and making the simulation shell the dominant lesson surface.
- `Long vertical section navigation`: fixed by removing the concept-page rail and replacing mobile overlay rails with a compact sticky strip.
- `Concept page overload`: reduced by simplifying the phase summary, demoting support utilities, and collapsing optional deep-dive sections.
- `Discovery card overload`: addressed through stronger feature-vs-secondary card hierarchy and reduced metadata density.
- `Badge and metadata clutter`: reduced on concept cards and in top-level navigation.
- `Weak CTA emphasis`: addressed with a clearer primary/secondary button system and fewer same-weight actions per section.
- `Global grid-pattern noise`: removed from the page background and limited to opt-in simulation contexts.
- `Text too small`: raised across key reading surfaces, controls, and phase guidance.
- `Poor mobile navigation`: replaced the hidden mobile section overlay with an in-flow sticky navigation strip.
- `Inconsistent spacing and card rhythm`: addressed with shared surface classes and an 8px-aligned spacing rhythm.

## Learning-platform principles adapted

The redesign borrows structural lessons from strong learning products without copying their branding:

- continuation is surfaced earlier and more clearly
- each page now aims to answer the next action more directly
- progress is visible, but lightweight
- instructional flow is chunked into fewer, clearer blocks
- interactive work remains the lesson core, with explanation content framing and reinforcing the bench instead of overshadowing it
- browsing is still broad, but grouped into more legible recommendation and filter structures

## Major tradeoffs

Several deliberate tradeoffs were made:

- The concept page now hides more optional material by default. This slightly reduces immediate content density, but improves first-pass comprehension and preserves the core learning arc.
- The shared page-section navigation system was simplified rather than fully removed across every route. That kept route behavior intact while reducing the worst mobile and visual problems.
- Discovery filters still use the existing state and query model. The redesign changes hierarchy and presentation first, instead of introducing a new filtering architecture.
- Track, guided, and challenge pages were improved through shared system changes and targeted hierarchy adjustments rather than a complete rewrite of every route template in one pass.

## Why this still fits Open Model Lab

Open Model Lab is not a dashboard product and not a static content library. The redesign keeps that product truth intact:

- the simulation remains the lesson core
- the authored Explore -> Understand -> Check flow still drives learning
- content structure, progress logic, and simulation behavior remain canonical
- the interface now spends more of its visual budget helping learners see what the page is about, what to do next, and how far they have progressed

## Second-pass hardening

The highest-value incomplete migration after the first redesign was the gap between the refreshed concept/home/start/library surfaces and the still-legacy guided/challenge hubs.

This follow-up patch focused only on that gap:

- `/guided` no longer renders through the section-rail path. The route now uses a lighter guided hub surface with one obvious top CTA, a featured collection, and disclosure-based clusters for goal paths and collection browsing.
- `/challenges` no longer renders `PageSectionFrame` or the old section-nav contract. The challenge hub now leads with one clear challenge CTA, a simplified progress recap, a collapsed starter-path cluster, and a depth-grouped challenge browser instead of one long flat result list.
- guided-path and guided-collection cards on these routes now expose one primary action by default instead of several same-weight actions competing in every card.
- the small-screen guided hero was tightened so the primary CTA stays inside the first mobile viewport.

Why this was the highest-value next step:

- the audit showed the most visible remaining inconsistency was the legacy rail/list/card density on `/guided` and `/challenges`
- concept pages, home, start, and the concept library were already on the new system, so finishing these hubs materially reduced product-wide design drift without restarting the redesign
- the change stayed inside route-visible UI seams and reused the existing progress/content helpers instead of widening into recommendation or architecture work

What was intentionally deferred:

- `/tracks/[slug]` still uses the older frame path. It shares some of the same legacy DNA, but it is also a much larger authored surface with heavier progress and checkpoint logic plus broad existing test coverage. Removing its remaining rail and condensing its metrics safely is a separate slice.
- adaptive recommendations, unified path maps, micro-lesson splitting, and broader accessibility or technical-debt work remain intentionally out of scope for this pass.

## Third-pass track refinement

The next highest-value slice was the remaining starter-track detail route.

Why track pages were the right next step:

- `/tracks/[slug]` was the last main learner-facing route still using the legacy frame and section-rail seam after concept, start, library, guided, and challenge migrations.
- the route still read more like a dense internal syllabus than a calm guided path, especially on small screens.
- its progress language and secondary detail blocks were still competing with the next action instead of supporting it.

What changed:

- `/tracks/[slug]` no longer renders through `PageSectionFrame`, `PageSectionNav`, or `PageSectionNavMobile`.
- the track hero now carries the primary start/continue action directly under the title instead of burying it deeper in the right column.
- the hero progress language was simplified into one quiet default treatment: one progress bar, one summary line, and an optional breakdown disclosure.
- the authored path remains intact, but the route now treats lower-priority material as disclosure content:
  - authored rationale and shared concept-page notes moved into an "About this track" disclosure
  - prerequisite guidance and share links moved into a collapsed "Track details" disclosure
- prerequisite recommendation cards now have a quieter `track-details` variant so the disclosure keeps one dominant action without changing the shared default card pattern used elsewhere.
- recap/checkpoint rows still expose their secondary concept links, but those links are visually demoted into low-emphasis text links so the main action remains obvious.

How progress and CTA hierarchy were simplified:

- the route now emphasizes one primary CTA above the fold instead of making the learner scan a long hero and a separate action card first.
- the loud solved/started/remaining language was reduced to one summary sentence by default, with the detailed counts moved behind a small breakdown disclosure.
- mobile-specific density was reduced by hiding low-value explanatory copy and secondary highlight chips on the smallest screens while preserving the track title, outcome, progress state, and CTA.

About/Pricing discoverability:

- `/about` and `/pricing` already existed, so this pass made them visible in the low-emphasis footer utility group.
- they were intentionally not added to the primary learner header, which remains focused on `Learn`, `Challenges`, `Explore`, and `Tracks`.

What remains intentionally deferred:

- the track route still has some dense authored content in the ordered path itself, especially on checkpoint rows. This pass simplified the hierarchy and CTA weight first without rewriting the authored path model.
- other `PageSectionFrame` consumers still exist on non-track surfaces such as public trust pages, topic/subject landings, and account analytics. Those were left alone because the confirmed learner-facing gap for this pass was the track detail route, not a repo-wide frame removal.

## Fourth-pass guided and concept hardening

The next highest-value unresolved product gap was guided collection detail.

Why this was the right slice:

- `/guided/[slug]` was still rendering through `PageSectionFrame`, which kept the old hidden section-nav seam alive on a live learner-facing route.
- the guided hub had already moved closer to the new learning-first system, but the detail route still read like a long internal reference page with too many tags, too many same-weight actions, and too many support tools competing with the authored path.
- concept pages were materially better than the original audit baseline, but the lower support chrome was still opening with more progress/share noise than it needed.

What changed:

- `/guided/[slug]` no longer renders through `PageSectionFrame`, `PageSectionNav`, or `PageSectionNavMobile`.
- the guided detail hero now reduces above-the-fold metadata to the essentials:
  - title
  - outcome summary
  - one quiet progress treatment
  - one primary CTA
  - one secondary browse action
- authored rationale, highlights, educator notes, diagnostics, and share/bundle tools were moved behind disclosure so the path itself stays dominant.
- guided step cards now present one primary CTA only by default. Any secondary route action is demoted to a low-emphasis text link instead of a second competing button.
- long guided sequences now use progressive disclosure:
  - current and upcoming steps stay visible first
  - completed steps collapse behind a disclosure
  - later steps collapse behind a separate disclosure when needed

Active-nav handling:

- the repo’s current primary navigation already has a dedicated `Guided` top-level item.
- this pass kept that taxonomy and added regression coverage so `/guided` and `/guided/[slug]` stay mapped to `Guided` instead of drifting back toward an old `Tracks` highlight.

Concept-density hardening:

- the concept route was not redesigned again.
- instead, the low-priority support chrome after the phase flow now defaults to disclosure:
  - bench/share tools
  - progress and starter-track cues
- compact concept progress and compact starter-track cue surfaces were simplified so they no longer lead with extra badge rows and concept-chip clutter.
- concept hero metadata was reduced to the highest-value context instead of repeating difficulty and track labels that already reappear elsewhere on the page.

What remains intentionally deferred:

- the broader concept-page architecture, phase model, and simulation shell were intentionally left intact.
- the old page-section rail still exists on non-target routes such as some public trust pages, topic/subject landings, and account analytics. This pass only removed the remaining learner-facing guided detail seam.
- deeper product strategy items from the QA/feature report such as unified learning maps, adaptive recommendations, playlists, pacing systems, or collaborative flows remain out of scope.

## Fifth-pass public discovery and orientation cleanup

The next highest-value slice after guided detail was the public discovery layer.

Why this was the right next step:

- the core learning routes were already much calmer, but the public discovery layer still carried visible legacy seams and weaker decision hierarchy.
- `/start`, `/concepts`, `/search`, and subject/topic landings were still the main places where learners had to decide what to do next, and the audit history kept pointing to the same issues there:
  - rail-based or frame-shaped structure still present in code
  - chip-heavy filter presentation
  - too many same-weight choices
  - badge and metadata clutter
  - inconsistent resume orientation across discovery surfaces

What changed:

- removed the `PageSectionFrame` seam from these public routes and owners:
  - `/start`
  - `/concepts`
  - `/search`
  - subject landing pages
  - topic landing pages
- `/concepts` no longer stacks a route intro ahead of the library browser hero. The library browser now owns the route’s first real decision surface.
- `ConceptLibraryBrowser` now uses calmer select-based filter controls for subject, topic, progress, sort, and the starter-track lens instead of multiple chip walls.
- the concept library now keeps the primary recommendation inside the main library hero so the obvious next step remains visible before the full filter stack.
- `ConceptTile` now exposes less default metadata and fewer chips so the title, summary, and main action stay dominant.
- `/start` now reduces above-the-fold competition by:
  - removing the hidden frame-nav seam
  - moving “How this works” behind disclosure
  - demoting direct-search and browse-all-subject actions into low-emphasis text links
  - turning the chooser controls into more stable grid layouts instead of loose wrapped chip rows
- subject landing pages now keep one dominant start action, one clearly secondary action, and demote extra browse/search actions to tertiary text links.
- topic landing pages now do the same and also stop duplicating the main CTA inside the supporting progress card.

Filter UX, CTA hierarchy, and card metadata:

- search and library now share the same calmer select control pattern instead of splitting between select rows and chip clouds.
- the active filter/result state is summarized more clearly inside the main library/search filter surface, with reset actions kept close to that summary.
- public discovery cards were kept on the existing design system, but their metadata was trimmed so the route title and primary CTA carry more visual weight.

Resume / continue handling:

- no new progress model was introduced.
- the existing local-first resume logic still powers the header, home, start, library, and search surfaces.
- this pass only made that resume behavior more consistent in presentation:
  - `/start` still honors saved work first
  - `/concepts` now surfaces the primary recommendation earlier
  - `/search` keeps the resume prompt near the top when there is no query

What was intentionally deferred:

- public trust/info routes such as `/about` and `/pricing` were left structurally alone in this pass because the higher-value learner-facing discovery work still outweighed that cleanup.
- account/dashboard routes still have legacy frame usage in places, but they were intentionally left out because this iteration was about public learner orientation, not signed-in control surfaces.
- deeper recommendation work such as adaptive ranking, learning maps, study queues, or playlist mechanics remains out of scope.

## Sixth-pass public info-page cleanup

The next clean, bounded slice after the discovery routes was the remaining public info-page rail seam.

Why `/about` and `/pricing` were the right next step:

- both routes were still passing `sectionNav` into `PageShell`, which meant they continued to render through `PageSectionFrame` and the old jump-navigation seam even though they are not dense learning flows.
- by this point, the main learner routes had already moved to calmer, more sequential reading patterns, so the old info-page rail stood out as unnecessary orientation overhead.
- these pages already had the right content and trustworthy tone. They needed less structure, not more product or marketing copy.

What changed:

- `/about` no longer passes `sectionNav` into `PageShell`.
- `/pricing` no longer passes `sectionNav` into `PageShell`.
- both pages now read as ordinary sequential public pages instead of rail-based documentation shells.
- `/about` keeps its existing hero CTA to the concept library, now exposed as the clear primary action without the extra section-nav chrome.
- `/pricing` now adds one lightweight hero CTA that jumps directly to the plan-actions block, so the page keeps one obvious next move without turning the page into a sales funnel.

What replaced the old seam:

- no replacement rail
- no hidden mobile overlay nav
- just the existing hero + stacked content sections already present in the route files

This was intentional. The content was already readable enough that a lighter layout was better than inventing another summary bar or mini-nav.

Adjacent trust/info routes:

- `/privacy`, `/terms`, `/ads`, and `/billing` still use the older info-page shell contract and were intentionally deferred.
- they share a similar seam, but broadening the patch to every trust page would have expanded this pass beyond the smallest safe slice.

## Seventh-pass physics taxonomy cleanup

The next bounded slice was the Physics topic taxonomy itself.

Why this was the right next step:

- the UI work had already made topic discovery calmer, but the underlying Physics taxonomy was still conceptually wrong in several places
- gravity/orbit content still lived inside Mechanics
- circuit content still lived inside Electricity
- magnetic-field content still lived inside Electromagnetism
- mirrors/lens content still lived inside Optics
- the old oscillations branch was still acting as a catch-all for waves, sound, and standalone resonance

What changed:

- moved the canonical concept-topic assignments in `content/catalog/concepts.json` so the affected concepts now belong to the correct topic branches
- replaced the old Physics topic map in `content/catalog/topics.json` with a more accurate sequence:
  - Mechanics
  - Gravity and Orbits
  - Oscillations
  - Waves
  - Sound
  - Fluids
  - Thermodynamics
  - Electricity
  - Circuits
  - Magnetism
  - Electromagnetism
  - Optics
  - Mirrors and Lenses
  - Modern Physics
- removed the old `Oscillations and Waves` mega-topic from visible discovery and folded `Damping / Resonance` back into `Oscillations`
- updated topic descriptions, introductions, and grouped overview copy so each topic now describes only the concepts it actually owns
- adjusted the Physics subject entry metadata so its featured topics and summary now match the split taxonomy
- updated the wave and electricity goal-path / guided-collection metadata where their topic-route steps still referenced the old branches
- kept the existing starter tracks and reused them where they already cleanly matched the new boundaries instead of inventing new navigation layers

Localization and derived data:

- updated the zh-HK concept overlays for the moved concept `topic` labels
- updated the zh-HK Physics subject and topic catalog entries for the affected public labels
- regenerated the content registry, i18n content bundle, and content variant manifest so discovery surfaces, counts, and localized topic labels stay in sync

What remained intentionally deferred:

- no new starter tracks were introduced for topics like `Mirrors and Lenses`; this pass was about taxonomy correctness, not new path creation
- no broader reshuffle was done outside the affected Physics branch, aside from the adjacent `Uniform Circular Motion` move into Mechanics
- no discovery UI redesign work was reopened; the patch stays at the canonical content and route-derived taxonomy layer

## Eighth-pass taxonomy hardening and coverage audit

The next slice after the taxonomy split was durability rather than another reshuffle.

Why this was the right follow-up:

- the canonical topic split was already correct, but old slugs such as `oscillations-and-waves` and `resonance` could still appear as half-working compatibility paths
- the new smaller Physics topics needed to feel intentional on their landing pages, not like empty leftovers after the split
- the right next product question was not “add lots more concepts now,” but “which topics are actually thin, and which are already focused enough?”

What changed:

- the topic route now canonicalizes old Physics topic slugs and permanently redirects them to the correct new topic page
- the compatibility alias layer in `lib/content/topics.ts` was kept, but user-facing route behavior now matches it explicitly instead of silently serving stale URLs
- the topic metadata introduced in the taxonomy split now drives more intentional small-topic landing pages:
  - compact, specific descriptions
  - clear first concept
  - cleaner adjacent-topic cues
  - starter-track or goal-path cues only where they still make sense for the smaller branch
- a dedicated `docs/physics-topic-coverage-audit.md` now classifies every Physics topic as:
  - focused and complete for now
  - coherent but sparse
  - missing obvious core concepts

What was intentionally deferred:

- this pass did not add a new batch of concepts or simulations just to inflate topic counts
- no large-scale new authoring wave was started unless clearly existing draft content had already been present, which it was not for the affected branches
