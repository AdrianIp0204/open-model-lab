# Quiz Authoring

Open Model Lab concept quizzes resolve through one shared session model with three supported modes:

- `static`: use only authored `quickTest.questions`
- `generated`: use only generated templates
- `hybrid`: mix authored static questions with generated instances to reach the session minimum

Every concept quiz attempt must produce at least 5 questions. The loader validates that contract during the content build path, so thin or broken quiz definitions fail loudly instead of silently dropping the quiz.

## Current Default Behavior

Existing concept files remain backward-compatible.

- If a concept already has 5 or more authored `quickTest.questions`, the quiz resolves as `static` by default.
- If a concept has fewer than 5 authored questions, the quiz resolves as `hybrid` by default.
- Hybrid quizzes keep the authored questions first, then fill the rest of the session with generated questions derived from worked examples and any authored templates.
- The misconception fallback is a last resort only. It is no longer part of the normal slot rotation when a parameterized template can still generate another valid question.

That default keeps current concept pages working without hand-editing every concept file, while still giving quantitative concepts reusable parameterized questions.

## Static Quiz Authoring

Author a standard fixed quiz inside `content/concepts/*.json`:

```json
{
  "quickTest": {
    "mode": "static",
    "questionCount": 5,
    "questions": [
      {
        "id": "my-question-1",
        "prompt": "Which statement is correct?",
        "type": "reasoning",
        "choices": [
          { "id": "a", "label": "Choice A" },
          { "id": "b", "label": "Choice B" },
          { "id": "c", "label": "Choice C" },
          { "id": "d", "label": "Choice D" }
        ],
        "correctChoiceId": "b",
        "explanation": "Why B is correct."
      }
    ]
  }
}
```

Rules:

- `mode: "static"` means the authored question list alone must satisfy `questionCount`.
- For production use, keep `questionCount >= 5`.
- Static question ids stay stable because achievements and retry flow both key off canonical question ids.

## Generated Template Authoring

Generated templates live under `quickTest.templates`.

Supported authored template kinds:

- `worked-example-result`
- `exact-angle-radians`

Example:

```json
{
  "quickTest": {
    "mode": "generated",
    "isQuantitative": true,
    "questionCount": 5,
    "questions": [],
    "templates": [
      {
        "id": "escape-threshold-template",
        "kind": "worked-example-result",
        "exampleId": "required-escape-speed"
      }
    ]
  }
}
```

How `worked-example-result` works:

- The template points at an existing `sections.workedExamples.items[*].id`.
- The quiz engine reuses the live worked-example builders in `lib/learning/liveWorkedExamples.ts` or `lib/learning/supplementalWorkedExamples.ts`.
- Each new attempt generates a fresh parameter snapshot, resolves the worked example once for that snapshot, and turns the resolved result into a multiple-choice question.
- Distractors are generated from alternate parameter snapshots for the same worked example, so they stay consistent with the specific numbers in that attempt.

The exact-angle template is a reusable symbolic generator for unit-circle and polar-style concepts. It produces exact radian answers such as `π/2`, `3π/4`, or `2π` instead of decimal approximations.

## Hybrid Quiz Authoring

Hybrid quizzes combine both:

```json
{
  "quickTest": {
    "mode": "hybrid",
    "isQuantitative": true,
    "questionCount": 5,
    "questions": [
      { "...": "static conceptual question" }
    ],
    "templates": [
      {
        "id": "example-template",
        "kind": "worked-example-result",
        "exampleId": "group-then-total-equivalent"
      }
    ]
  }
}
```

Use `hybrid` when:

- the concept already has strong conceptual multiple-choice items
- the concept is also quantitative and should generate fresh calculation practice

## Quantitative Flag

Use `quickTest.isQuantitative` when the concept should be treated as a quantitative quiz surface explicitly.

```json
{
  "quickTest": {
    "mode": "hybrid",
    "isQuantitative": true,
    "questionCount": 5,
    "questions": [],
    "templates": []
  }
}
```

Current audit logic falls back to the simulation kind when `isQuantitative` is omitted, but explicit authoring is preferred for concepts where quiz intent matters.

## Retry Flow

The quiz flow is:

1. Initial round
2. Evaluate the answered questions
3. If anything was missed, open a separate round labeled `Try Again`
4. Re-show only the missed questions in that round
5. Keep previously correct questions cleared

Generated questions are instantiated once per attempt. If one is missed, the exact same generated instance comes back in `Try Again`. New numbers appear only after a full restart or new attempt.

## Fallback Policy

Fallback-generated quiz questions are no longer allowed in shipped concept sessions.

- The runtime still has a bounded fallback path internally, but shipped content is expected to reach the session minimum through authored questions or concept-specific generated templates.
- Loader validation fails if a published concept still builds fallback-backed quiz questions.
- The audit in `tests/content/quiz-audit.test.ts` also asserts zero fallback usage for shipped concepts.
- Draft and author-preview flows may still inspect unpublished content that uses fallback while the authoring work is in progress. That boundary is intentional so preview routes stay usable while content is being tightened.

If a concept would otherwise need fallback, the preferred fix is:

1. add enough authored static questions, or
2. add concept-specific templates, or
3. upgrade the worked-example builders so derived generation is genuinely useful

Fallback is not a normal authoring strategy.

## Choosing Clean Numeric Ranges

The generated question helpers prefer mental-math-friendly values.

Use values that are:

- integers
- halves or quarters when needed
- preset values that already exist in the concept simulation
- simple angle families such as `30°`, `45°`, `60°`, `90°`, and their common unit-circle partners

Avoid:

- long decimals
- awkward fractions
- parameter combinations that only differ in insignificant rounding noise

If a concept needs more control than the default generator gives, add an explicit template instead of hoping the generic fallback stays readable.

## Symbolic Answer Formatting

The symbolic formatter in `lib/quiz/symbolic.ts` preserves exact display for constant-based answers.

Examples:

- `2π`
- `π/2`
- `3π/4`
- `3g`
- `k/2`

Do not flatten those into decimals unless the concept explicitly wants an approximation.

## Guaranteeing The Five-Question Minimum

The supported ways to satisfy the minimum are:

- `static`: author 5 or more fixed questions
- `generated`: provide enough reusable templates to instantiate 5 generated questions
- `hybrid`: author some fixed questions and let generated templates fill the remainder

Validation happens in `lib/content/loaders.ts` through the shared quiz session builder. If a concept cannot build a full session, content validation fails during development and build.

## Coverage Audit

The CI-facing quiz audit lives in `tests/content/quiz-audit.test.ts`.

It verifies, for every concept:

- resolved quiz mode
- session question count
- whether the concept is treated as quantitative
- whether the built session used explicit templates, derived generation, built-in symbolic templates, or fallback questions
- whether parameterized generated questions vary across fresh attempts

Run it directly when authoring quiz content:

```bash
pnpm test tests/content/quiz-audit.test.ts
```
