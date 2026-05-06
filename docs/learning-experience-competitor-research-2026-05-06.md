# Learning experience competitor research — 2026-05-06

Concise product research note for Open Model Lab UI/UX, revision mechanics, wording, and learning psychology.

## Bottom line

Open Model Lab should not copy the dominant pattern of the education web — a course catalog with videos, cards, points, and quizzes bolted on. Its strongest position is narrower and better: **a live concept bench where the learner changes something, predicts what will happen, sees the model respond, explains it, then proves retention later.**

The UI should therefore optimize for four feelings:

1. **“I know what to do first.”** One clear first action above the fold.
2. **“The simulation is teaching me, not decorating the page.”** Controls, labels, graph/equation cues, and prompts stay near the bench.
3. **“I am becoming more capable.”** Progress reflects mastery evidence, not page completion.
4. **“Revision is built in.”** The site asks the learner to retrieve, compare, and apply concepts after time has passed.

## What the competitor pass suggests

### Khan Academy

Observed pattern: strong course maps, unit hierarchy, skill lists, mastery states, quizzes, unit tests, and course challenges.

Useful for OML:

- Make progress legible at concept / topic / path level.
- Use skill verbs such as **Understand**, **Apply**, **Distinguish**, **Predict**, **Explain**.
- Give learners a visible “course challenge” equivalent, but tie it to concept/simulation evidence.

Do not copy:

- Video/course-first hierarchy.
- Large mastery-point framing that can turn learning into accounting.

### Brilliant

Observed pattern: “learn by doing,” one concept at a time, guided lessons, interactive problem solving, adaptive practice language, motivational polish.

Useful for OML:

- Put a small guided stepper around the simulation: **Try → Notice → Explain → Check**.
- Prefer short interactive prompts over long up-front exposition.
- Make feedback feel like a coach pointing to the next move, not a grade stamp.

Do not copy:

- Heavy motivational/gamified surface as the main value proposition.
- Broad “fun” branding at the expense of scientific seriousness.

### PhET

Observed pattern: simulation-first trust, clear topic tags, learning goals, related sims, strong filters, accessibility/inclusive-feature metadata.

Useful for OML:

- Keep the simulation visually dominant.
- Put learning goals close to the sim and make them experimentally testable.
- Add “related benches” and concept-neighbor links after the primary loop.
- Treat accessibility/inclusive features as real product quality, not footer detail.

Do not copy:

- A detached sim library where the sim and lesson live separately. OML’s advantage is integration.

### Quizlet

Observed pattern: fast revision modes, flashcards, learn/test flows, simple review entry points.

Useful for OML:

- Add a local-first **Review Due** queue.
- Turn concepts into retrieval prompts, prediction prompts, and graph/equation interpretation cards.
- Let the learner quickly review without re-opening a full long lesson.

Do not copy:

- Pure definition drilling as the default. STEM concepts need transfer, discrimination, and model-based reasoning.

### Duolingo

Observed pattern: obvious daily action, streak/continuation pressure, bite-sized loops, strong onboarding funnel.

Useful for OML:

- Surface one obvious **Continue** or **Review due** action in the header/home/start flow.
- Keep learning loops small enough to complete in 3–8 minutes.
- Use streaks only if they support durable study habits.

Do not copy:

- Habit mechanics that reward attendance more than understanding.
- Leaderboards/XP as the main psychology.

### CK-12

Observed pattern: broad student entry, subject browsing, simulations/practice resources, classroom-friendly framing.

Useful for OML:

- Keep catalog browsing calm and filterable.
- Pair concepts with practice and simulations clearly.
- Make OML feel usable by a self-learner and eventually by teachers, without turning into a worksheet warehouse.

Do not copy:

- Broad resource-library sprawl.

## Learning-science implications

### 1. Reduce split attention around the simulation

For concept pages, the equation, graph, variable labels, controls, and task prompt should be spatially close to the part of the simulation they refer to. Avoid making the learner scan between distant rails, long text blocks, and the bench.

Implementation shape:

- Add inline labels/callouts inside or immediately beside the bench.
- Highlight the active variable in the control, graph, and equation at the same time.
- Put “what to try next” directly below the bench, not below several support cards.

### 2. Segment the learning loop

The first pass should show one learner-paced step at a time. Long pages can still exist, but the active learning surface should be compact.

Recommended concept loop:

1. **Try:** change one variable.
2. **Predict:** choose/write what should happen.
3. **Observe:** run the sim and compare.
4. **Explain:** connect observation to equation/graph/model.
5. **Check:** answer a transfer question.

### 3. Make retrieval practice native

Progress should not be awarded only because a learner scrolled or completed an immediate quiz. OML should store evidence that the learner retrieved or applied the concept later.

Local-first progress events worth tracking:

- `predicted-before-running`
- `explained-observation`
- `solved-without-hint`
- `retrieved-after-delay`
- `distinguished-from-neighbor-concept`

### 4. Build spaced review before more gamification

The highest-value revision feature is a **Review Due** queue, not badges. It should include short prompts such as:

- “Predict what happens if amplitude doubles.”
- “Which graph feature represents phase?”
- “Why does mass affect period here?”
- “Tell SHM apart from uniform circular motion.”

### 5. Use faded worked examples

For math/physics problems, move from full support to independence:

1. Full worked example.
2. Same structure with one missing step.
3. New numbers/context with hints available.
4. Nearby concept mixed in to force discrimination.

### 6. Prefer explanatory feedback

Feedback should answer:

- What did the learner think?
- What does the model show?
- What is the next useful move?

Avoid feedback that only says correct/incorrect. For OML, the best feedback often points back to the simulation: “Run the high-mass case again and watch the period marker.”

## Recommended UI structure for a concept page

Above the fold:

1. Concept title and one-sentence outcome.
2. Primary simulation bench.
3. One active task card: **Try this first**.
4. Compact phase stepper: **Explore → Understand → Check** or **Try → Explain → Prove**.
5. Nearby equation/graph/control cue panel.

Below the fold:

1. What changed / why it matters.
2. Worked example sequence.
3. Common misconception repair.
4. Review prompts.
5. Related concepts / next bench.
6. Deep reference/accessibility/teacher notes behind disclosure.

## Wording recommendations

Use active, experiment-oriented language:

- “Try this first” instead of “Overview”.
- “Predict before running” instead of “Question”.
- “What changed?” instead of “Explanation”.
- “Check your model” instead of “Quiz”.
- “Review due” instead of “Practice”.
- “Can you still explain it?” instead of “Continue progress”.

Tone: calm, precise, lightly encouraging. Avoid corporate edtech claims like “AI-powered personalized learning” unless the feature is visibly specific and useful.

## Implementation order

### Slice 1 — Concept-page micro-loop

Extend the existing concept/simulation seams rather than inventing a new lesson engine:

- `ConceptSimulationRenderer`
- `SimulationShell`
- existing concept content files

Add a compact active prompt area around the bench: prediction, observation, explanation, check.

### Slice 2 — Local-first Review Due

Extend `lib/progress` with small review events and due-state calculation. Start with local storage only. Do not require sign-in.

### Slice 3 — Mastery evidence language

Replace generic completion language with evidence-based states:

- Started
- Tried the model
- Explained once
- Solved without hint
- Retrieved after delay
- Can distinguish from nearby concept

### Slice 4 — Faded challenge sets

Add challenge sequencing:

- worked → partially worked → independent → mixed/discrimination.

Keep this tied to concepts and simulations, not isolated quiz pages.

### Slice 5 — Discovery/home copy polish

Make `/`, `/start`, library, and topic pages point toward the same learning loop:

- continue current bench
- review due
- start a guided path
- browse concepts

Avoid making all four equal-weight CTAs.

## Strongest product bet

The strongest bet is **not** “more content.” It is making each concept page behave like a small scientific instrument plus a tutor:

- one thing to try,
- one model response to notice,
- one explanation to form,
- one challenge to prove it,
- one later review to make it stick.

If OML gets that loop right, the site can feel meaningfully different from Khan/Brilliant/PhET/Quizlet instead of sitting between them.

## Sources inspected

Product/UI examples:

- Open Model Lab home: https://openmodellab.com/en
- Open Model Lab start: https://openmodellab.com/en/start
- Open Model Lab SHM concept: https://openmodellab.com/en/concepts/simple-harmonic-motion
- Khan Academy high school physics: https://www.khanacademy.org/science/highschool-physics
- Brilliant: https://brilliant.org/
- PhET simulations filter: https://phet.colorado.edu/en/simulations/filter?subjects=physics&type=html
- PhET Masses and Springs: https://phet.colorado.edu/en/simulations/masses-and-springs
- Quizlet: https://quizlet.com/
- CK-12 student page: https://www.ck12.org/student/
- CK-12 physics simulations: https://interactives.ck12.org/simulations/physics.html
- Duolingo: https://www.duolingo.com/

Learning-science references:

- Dunlosky et al. (2013), *Improving Students’ Learning With Effective Learning Techniques*: https://journals.sagepub.com/doi/full/10.1177/1529100612453266
- Roediger & Karpicke (2006), test-enhanced learning: https://pubmed.ncbi.nlm.nih.gov/16507066/
- Hattie & Timperley (2007), feedback: https://journals.sagepub.com/doi/pdf/10.3102/003465430298487
- Atkinson, Derry, Renkl & Wortham (2000), worked examples: https://journals.sagepub.com/doi/10.3102/00346543070002181
- Mayer & Moreno (2003), multimedia cognitive load: https://doi.org/10.1207/S15326985EP3801_6
- Rohrer & Taylor (2007), interleaved mathematics practice: https://digitalcommons.usf.edu/psy_facpub/1767/
