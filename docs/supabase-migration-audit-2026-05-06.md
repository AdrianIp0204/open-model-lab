# Supabase Migration Audit — 2026-05-06

Status: read-only production audit completed. No remote database mutation was performed.

## Why this audit exists

The Mac mini copy of the repo briefly had five old migration files copied in from the private transfer directory. `supabase migration list` reported them as local-only, which made future database work unsafe: a blind `supabase db push` would try to reconcile old history before we understood what production already has.

## Commands used

Read-only checks only:

- `supabase migration list`
- `supabase db query --linked` against Postgres metadata tables (`information_schema`, `pg_class`, `pg_policies`, `pg_proc`, `pg_constraint`, `pg_indexes`, `supabase_migrations.schema_migrations`)

An attempted `supabase db dump --linked --schema public` did not run because Docker is not available on this Mac mini. The audit therefore used targeted metadata queries instead of a full schema dump.

## Migration history

After quarantining the stale copied files out of `supabase/migrations/`, local and remote migration histories match:

| Version | Local | Remote | Purpose |
| --- | --- | --- | --- |
| `20260505120000` | yes | yes | Create `user_ai_token_usage` and `increment_user_ai_token_usage` RPC. |
| `20260506013000` | yes | yes | Add hardened AI token quota RPC. |
| `20260506020500` | yes | yes | Fix AI token usage record RPC. |

The stale copied files were preserved locally under ignored path `supabase/_stale-migrations-2026-05-06/`:

- `20260329164000_create_user_concept_progress_snapshots.sql`
- `20260402101500_create_user_entitlements.sql`
- `20260402143000_create_user_billing_profiles.sql`
- `20260403101500_create_user_achievements.sql`
- `20260407120000_add_history_to_user_concept_progress_snapshots.sql`

They are intentionally not in the live `supabase/migrations/` path now.

## Remote schema findings

Production already has the account, billing, achievements, and AI quota tables present with RLS enabled:

- `public.user_concept_progress_snapshots`
- `public.user_entitlements`
- `public.user_billing_profiles`
- `public.processed_stripe_webhook_events`
- `public.user_achievement_stats`
- `public.user_achievement_progress_keys`
- `public.user_earned_achievements`
- `public.user_reward_unlocks`
- `public.user_achievement_active_sessions`
- `public.user_ai_token_usage`

The AI quota RPCs are also present, `security definer`, and executable by `service_role` only:

- `public.increment_user_ai_token_usage(...)`
- `public.record_user_ai_token_usage_with_limit(...)`

## Important mismatch

Do **not** apply the quarantined old migrations as-is.

They are not just missing history records; at least some are stale compared with production:

- The copied achievement migration defines several `user_id` columns as `text`; production uses `uuid` with foreign keys to `auth.users(id)`.
- The copied `user_entitlements` migration lacks the production `tier default 'free'` detail.
- Production has indexes/constraints not represented exactly by the old copied files, such as partial unique Stripe indexes and non-negative achievement counters.
- The copied history migration would add `user_concept_progress_snapshots.history`, but production currently does **not** have that column.

The only obvious remaining schema gap from the app/docs perspective is:

- `public.user_concept_progress_snapshots.history` is absent in production.

The app has compatibility fallback for snapshot-only progress, but docs say Premium checkpoint history / some analytics are degraded without the history column.

## Recommendation

1. Keep the quarantined old files as reference only; do not restore them into `supabase/migrations/` and do not apply them directly.
2. Treat the current canonical migration history as the three AI quota migrations already present both locally and remotely.
3. If we want to repair the actual schema gap, create a new forward-only migration with a fresh timestamp after `20260506020500`, probably limited to:

```sql
alter table public.user_concept_progress_snapshots
add column if not exists history jsonb not null default '{"version":1,"events":[],"masteryTimeline":[]}'::jsonb;
```

4. Before applying that to production, run the normal local gates and then perform a deliberate `supabase db push` / migration application as a separate DB-change step. Do not bundle production DB mutation into routine frontend deploys.
5. Update `docs/account-sync-local-setup.md` later so it stops pointing operators at the stale old migration filenames as if they were canonical production history.

## Current decision

For now, the repo migration path is clean and aligned with remote history. Production DB was not changed. The next safe product step can be frontend/content/UI work, while the history-column repair remains a small explicit DB task for later.
