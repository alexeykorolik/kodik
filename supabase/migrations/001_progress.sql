create table if not exists public.learner_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_lesson_ids text[] not null default '{}',
  current_lesson integer,
  started boolean not null default false,
  updated_at timestamptz not null default now()
);
-- Compatible with the first five-exercise prototype.
alter table public.learner_progress add column if not exists current_lesson integer;
alter table public.learner_progress add column if not exists started boolean not null default false;
alter table public.learner_progress enable row level security;
drop policy if exists "own progress" on public.learner_progress;
create policy "own progress" on public.learner_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update on public.learner_progress to authenticated;
