create or replace function public.record_user_ai_token_usage_with_limit(
  p_user_id uuid,
  p_period_yyyymm text,
  p_prompt_tokens bigint,
  p_completion_tokens bigint,
  p_thoughts_tokens bigint,
  p_total_tokens bigint,
  p_monthly_limit bigint
)
returns table (
  accepted boolean,
  user_id uuid,
  period_yyyymm text,
  total_tokens bigint,
  prompt_tokens bigint,
  completion_tokens bigint,
  thoughts_tokens bigint,
  request_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row public.user_ai_token_usage;
  updated_row public.user_ai_token_usage;
  normalized_prompt_tokens bigint := greatest(p_prompt_tokens, 0);
  normalized_completion_tokens bigint := greatest(p_completion_tokens, 0);
  normalized_thoughts_tokens bigint := greatest(p_thoughts_tokens, 0);
  normalized_total_tokens bigint := greatest(p_total_tokens, 0);
  normalized_monthly_limit bigint := greatest(p_monthly_limit, 0);
  next_total_tokens bigint;
  usage_accepted boolean;
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
    0,
    0,
    0,
    0,
    0,
    now()
  )
  on conflict on constraint user_ai_token_usage_pkey do nothing;

  select *
    into existing_row
  from public.user_ai_token_usage usage
  where usage.user_id = p_user_id
    and usage.period_yyyymm = p_period_yyyymm
  for update;

  next_total_tokens := existing_row.total_tokens + normalized_total_tokens;
  usage_accepted := next_total_tokens <= normalized_monthly_limit;

  update public.user_ai_token_usage usage
  set
    total_tokens = next_total_tokens,
    prompt_tokens = usage.prompt_tokens + normalized_prompt_tokens,
    completion_tokens = usage.completion_tokens + normalized_completion_tokens,
    thoughts_tokens = usage.thoughts_tokens + normalized_thoughts_tokens,
    request_count = usage.request_count + 1,
    updated_at = now()
  where usage.user_id = p_user_id
    and usage.period_yyyymm = p_period_yyyymm
  returning * into updated_row;

  return query
    select
      usage_accepted,
      updated_row.user_id,
      updated_row.period_yyyymm,
      updated_row.total_tokens,
      updated_row.prompt_tokens,
      updated_row.completion_tokens,
      updated_row.thoughts_tokens,
      updated_row.request_count,
      updated_row.updated_at;
end;
$$;

comment on function public.record_user_ai_token_usage_with_limit(
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint
) is
  'Atomically records AI Coach token usage and returns whether the request remained within the monthly limit.';

revoke all on function public.record_user_ai_token_usage_with_limit(
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint
) from public, anon, authenticated;

grant execute on function public.record_user_ai_token_usage_with_limit(
  uuid,
  text,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint
) to service_role;

notify pgrst, 'reload schema';
