# AI Learning Coach

The AI Learning Coach is the first shared AI foundation for Open Model Lab. It is a Supporter feature that gives learners one compact piece of guidance on concept pages: one thing to try, one thing to notice, and one question to think about.

The AI coach is designed to guide learners through existing page and simulation content. It should not be treated as the source of truth. Validated concept metadata, formulas, and deterministic simulation logic remain the source of truth.

## What It Does

- Builds a scoped learning context from the current concept page, formulas, key ideas, simulation controls, graph state, and the current runtime snapshot when available.
- Sends that scoped context to the server-only AI provider through `POST /api/ai/coach`.
- Returns a short JSON response with `action`, `observe`, `question`, and `citations`.
- Falls back to a safe generic guide when the model response is missing, invalid, or ungrounded.
- Enforces signed-in Supporter access on the server before any Gemini request is made.

## What It Does Not Do

- It is not a generic chatbot.
- It does not keep a chat transcript or long conversation history.
- It does not accept freeform learner text input.
- It does not do OCR, voice, tutor memory, teacher dashboards, admin critique, generated practice questions, or AI-generated simulations.
- It does not replace concept content, authored formulas, quizzes, deterministic simulation logic, or route-owned progress behavior.

## Environment

Development AI guidance uses Gemini through a server-side API key.

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
AI_FEATURES_ENABLED=true
AI_LOGGING_ENABLED=true
AI_RATE_LIMIT_MAX_REQUESTS=20
AI_RATE_LIMIT_WINDOW_SECONDS=600
AI_RATE_LIMIT_MAX_BUCKETS=5000
AI_MONTHLY_TOKEN_LIMIT=10000000
AI_TRUST_CLOUDFLARE_CONNECTING_IP=false
```

Keep `GEMINI_API_KEY` server-side. Do not expose it through `NEXT_PUBLIC_` variables.

`GEMINI_MODEL` defaults to `gemini-2.5-flash-lite` in code when the variable is absent. Keep the value configurable because Gemini model names and endpoint behavior can change.

For Cloudflare/OpenNext deployment, the non-secret AI variables can be placed in Wrangler `vars` or Cloudflare dashboard variables. `GEMINI_API_KEY` must be configured as a Cloudflare runtime secret, for example with `wrangler secret put GEMINI_API_KEY`, and must not be placed in `wrangler.jsonc` `vars`. Setting the key only as a build variable is not enough because `/api/ai/coach` reads it at Worker runtime when the learner clicks the coach. See [launch readiness](./launch-readiness.md#ai-learning-coach-runtime-variables).

## Supporter Access And Quota

`/api/ai/coach` is signed-in Supporter-only. The client hides the model request path for signed-out and free users, but the server enforces the same boundary authoritatively:

- `503 ai_features_disabled` when `AI_FEATURES_ENABLED` is not `true`
- `401 ai_auth_required` when no server-authenticated account session exists
- `403 ai_premium_required` when the signed-in account does not have the `canUseAiCoach` capability
- `429 ai_monthly_quota_exceeded` when the account has reached the monthly token cap

Internal entitlement tiers remain `free | premium`. The user-facing Supporter wording maps to the existing `premium` entitlement; it does not introduce a second billing tier.

The monthly token cap defaults to `AI_MONTHLY_TOKEN_LIMIT=10000000` total Gemini tokens per user per UTC month. Usage is stored server-side in Supabase/Postgres in `public.user_ai_token_usage`, keyed by account id and `YYYY-MM` period. The table is protected with RLS and is updated through server/service-role paths only.

The Gemini provider records `usageMetadata` when Gemini returns it. If a successful Gemini response payload does not include usage metadata, the server records a conservative estimate from prompt and response text length. Successful Gemini attempts that return a payload count toward quota even when that payload later fails JSON validation or grounding.

## Privacy

The model prompt receives only scoped learning context. The prompt builder strips `userId` before sending context to Gemini. Do not add names, emails, account state, raw learner identity, or private account records to the AI context.

AI logging is metadata-only when `AI_LOGGING_ENABLED=true`. Logs should include request id, timestamp, mode, page slug, simulation id, success or failure state, fallback usage, validation failure reason, and latency. Do not log API keys, full AI context, raw learner answers, or model raw output.

## Rate Limiting

`/api/ai/coach` uses a short-window server-side in-memory rate limiter in addition to the persistent monthly token quota. Defaults are 20 requests per 10 minutes:

- `AI_RATE_LIMIT_MAX_REQUESTS=20`
- `AI_RATE_LIMIT_WINDOW_SECONDS=600`
- `AI_RATE_LIMIT_MAX_BUCKETS=5000`

Expired limiter buckets are pruned during request handling, and `AI_RATE_LIMIT_MAX_BUCKETS` bounds the in-memory bucket map before expiry.

Server rate limiting ignores any `context.userId` supplied by the client. Because the AI coach is signed-in Supporter-only, `/api/ai/coach` resolves identity from the server-side account session using the incoming cookie header and keys the limiter by that trusted account id. Spoofable headers such as `x-forwarded-for`, `x-real-ip`, `x-client-ip`, and `user-agent` are intentionally not used for limiter identity. `cf-connecting-ip` is not needed for normal AI coach access; `AI_TRUST_CLOUDFLARE_CONNECTING_IP` remains documented for environments that reuse lower-level AI/network helpers and should only be enabled when requests are guaranteed to pass through Cloudflare or equivalent trusted proxy protection.

## Validation And Grounding

Responses are parsed from model text, tolerate fenced JSON, and are validated with zod. Required fields are:

- `action`
- `observe`
- `question`
- `citations`

The grounding check is intentionally lightweight. It catches obvious unsupported formula citations, simulation citations without simulation context, learning-flow citations without learning-flow context, and simulation-control citations that do not match known control keys.

If Gemini fails, returns invalid JSON, returns an invalid shape, or fails grounding after one retry, the API returns a safe fallback response.

## Concept Page Context

Concept pages provide AI context through `buildAiLearningContext` in `lib/ai/context.ts`.

The context maps existing source-of-truth data into an AI-safe shape:

- concept slug, title, subject, level, objectives, key ideas, formulas, and prerequisites
- simulation id, controls, current state, graph state, and selected mode
- current runtime snapshot from `ConceptLearningBridge` when available
- an empty learning-flow scaffold until a route-visible current-step signal is intentionally added

The context builder is an adapter over current content and runtime seams. It should not become a second content graph or a second simulation-state model.

## Future Modes

The shared request model already supports:

- `guide`
- `hint`
- `explain`
- `ask`
- `next-step`

New UI affordances can call those modes through the existing hook and API route, but each expansion should stay page-aware, short, grounded, and transcript-free unless a future task explicitly changes the product scope.
