create table if not exists public.user_ai_token_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_yyyymm text not null,
  total_tokens bigint not null default 0,
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  thoughts_tokens bigint not null default 0,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_yyyymm),
  constraint user_ai_token_usage_period_format
    check (period_yyyymm ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  constraint user_ai_token_usage_non_negative
    check (
      total_tokens >= 0
      and prompt_tokens >= 0
      and completion_tokens >= 0
      and thoughts_tokens >= 0
      and request_count >= 0
    )
);

alter table public.user_ai_token_usage enable row level security;

comment on table public.user_ai_token_usage is
  'Server-maintained monthly AI token usage for premium AI Learning Coach quota enforcement.';

create or replace function public.increment_user_ai_token_usage(
  p_user_id uuid,
  p_period_yyyymm text,
  p_prompt_tokens bigint,
  p_completion_tokens bigint,
  p_thoughts_tokens bigint,
  p_total_tokens bigint
)
returns public.user_ai_token_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.user_ai_token_usage;
begin
  insert into public.user_ai_token_usage (
    user_id,
    period_yyyymm,
    total_tokens,
    prompt_tokens,
    completion_tokens,
    thoughts_tokens,
    request_count,
    updated_at
  )
  values (
    p_user_id,
    p_period_yyyymm,
    greatest(p_total_tokens, 0),
    greatest(p_prompt_tokens, 0),
    greatest(p_completion_tokens, 0),
    greatest(p_thoughts_tokens, 0),
    1,
    now()
  )
  on conflict (user_id, period_yyyymm)
  do update set
    total_tokens = public.user_ai_token_usage.total_tokens + excluded.total_tokens,
    prompt_tokens = public.user_ai_token_usage.prompt_tokens + excluded.prompt_tokens,
    completion_tokens = public.user_ai_token_usage.completion_tokens + excluded.completion_tokens,
    thoughts_tokens = public.user_ai_token_usage.thoughts_tokens + excluded.thoughts_tokens,
    request_count = public.user_ai_token_usage.request_count + 1,
    updated_at = now()
  returning * into updated_row;

  return updated_row;
end;
$$;

revoke all on function public.increment_user_ai_token_usage(
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  bigint
) from public, anon, authenticated;

grant execute on function public.increment_user_ai_token_usage(
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  bigint
) to service_role;
