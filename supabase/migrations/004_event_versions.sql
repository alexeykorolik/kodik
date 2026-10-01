alter table public.learning_events
  add column if not exists curriculum_version text not null default 'legacy',
  add column if not exists app_version text not null default 'legacy',
  add column if not exists lesson_key text;
update public.learning_events set lesson_key = 'legacy:' || lesson::text where lesson_key is null;
alter table public.learning_events alter column lesson_key set not null;
create index if not exists learning_events_release_idx on public.learning_events(curriculum_version, app_version, lesson_key, occurred_at);
-- Existing RLS policies and service-only privileges remain in force.
