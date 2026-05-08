-- Exam Rescue v0 schema for Open Model Lab.
-- Review before applying to production. This migration is intentionally not run by deploy.

create extension if not exists pgcrypto;

create table if not exists public.exam_rescue_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_exam_board text,
  preferred_qualification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_rescue_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_board text not null,
  qualification text not null,
  unit_code text not null,
  unit_title text not null,
  exam_date date,
  target_grade text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_rescue_topic_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.exam_rescue_goals(id) on delete cascade,
  topic_slug text not null,
  status text not null default 'not-started' check (status in ('not-started', 'red', 'yellow', 'green')),
  diagnostic_correct integer not null default 0 check (diagnostic_correct >= 0),
  diagnostic_total integer not null default 0 check (diagnostic_total >= 0),
  drill_correct integer not null default 0 check (drill_correct >= 0),
  drill_total integer not null default 0 check (drill_total >= 0),
  misconception_tags text[] not null default '{}',
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, topic_slug)
);

create table if not exists public.exam_rescue_question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.exam_rescue_goals(id) on delete cascade,
  topic_slug text not null,
  question_id text not null,
  phase text not null check (phase in ('diagnostic', 'drill')),
  selected_choice_id text not null,
  correct boolean not null,
  misconception_tag text,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_rescue_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.exam_rescue_goals(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  snapshot jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exam_rescue_goals_user_status_idx
  on public.exam_rescue_goals (user_id, status, updated_at desc);

create index if not exists exam_rescue_topic_states_goal_status_idx
  on public.exam_rescue_topic_states (goal_id, status, updated_at desc);

create index if not exists exam_rescue_question_attempts_goal_topic_idx
  on public.exam_rescue_question_attempts (goal_id, topic_slug, created_at desc);

create index if not exists exam_rescue_sessions_goal_started_idx
  on public.exam_rescue_sessions (goal_id, started_at desc);

create or replace function public.set_exam_rescue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_exam_rescue_profiles_updated_at on public.exam_rescue_profiles;
create trigger set_exam_rescue_profiles_updated_at
before update on public.exam_rescue_profiles
for each row execute function public.set_exam_rescue_updated_at();

drop trigger if exists set_exam_rescue_goals_updated_at on public.exam_rescue_goals;
create trigger set_exam_rescue_goals_updated_at
before update on public.exam_rescue_goals
for each row execute function public.set_exam_rescue_updated_at();

drop trigger if exists set_exam_rescue_topic_states_updated_at on public.exam_rescue_topic_states;
create trigger set_exam_rescue_topic_states_updated_at
before update on public.exam_rescue_topic_states
for each row execute function public.set_exam_rescue_updated_at();

drop trigger if exists set_exam_rescue_sessions_updated_at on public.exam_rescue_sessions;
create trigger set_exam_rescue_sessions_updated_at
before update on public.exam_rescue_sessions
for each row execute function public.set_exam_rescue_updated_at();

alter table public.exam_rescue_profiles enable row level security;
alter table public.exam_rescue_goals enable row level security;
alter table public.exam_rescue_topic_states enable row level security;
alter table public.exam_rescue_question_attempts enable row level security;
alter table public.exam_rescue_sessions enable row level security;

create policy "Users can read their own exam rescue profile"
  on public.exam_rescue_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own exam rescue profile"
  on public.exam_rescue_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own exam rescue profile"
  on public.exam_rescue_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own exam rescue goals"
  on public.exam_rescue_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own exam rescue topic states"
  on public.exam_rescue_topic_states for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own exam rescue attempts"
  on public.exam_rescue_question_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own exam rescue sessions"
  on public.exam_rescue_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
