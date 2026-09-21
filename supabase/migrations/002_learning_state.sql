alter table public.learner_progress add column if not exists learning_state jsonb not null default '{}'::jsonb;
-- Existing ownership/RLS policy also protects stars, attempts and tutorial progress.
