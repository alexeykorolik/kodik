-- Run as project administrator. No raw code or names are in this table.
-- Select actual pilot dates and ONE curriculum cohort; optionally filter app_version too.
-- Historical 'legacy' events must not be mixed with this release.
with events as (
 select * from public.learning_events where occurred_at >= current_date - interval '14 days'
 and curriculum_version='2026-10-01.2'
), first_checks as (
 select distinct on (learner_id, lesson) learner_id, lesson, data
 from events where name='check' and lesson>0 order by learner_id,lesson,occurred_at,id
)
select
 (select count(distinct learner_id) from events) as anonymous_browser_ids,
 (select count(distinct session_id) from events) as sessions,
 (select count(*) from events where name='lesson_open') as lesson_opens,
 (select count(*) from events where name='lesson_completed') as completions,
 (select percentile_cont(0.5) within group(order by (data->>'completionMs')::numeric / 1000)
  from events where name='lesson_completed' and data ? 'completionMs') as median_completion_seconds,
 (select avg((data->>'stars')::numeric) from first_checks) as first_check_stars,
 (select avg(case when data->>'passed'='true' then 1.0 else 0.0 end) from first_checks) as first_check_success,
 (select count(*) from events where name='support_changed') as support_changes,
 (select count(*) from events where name='corrective_completed') as corrective_completions,
 (select count(*) from events where name='ai_hint_generated') as ai_hints,
 (select count(*) from events where name='ai_hint_fallback') as ai_fallbacks;

-- A decrease of help is followed through the same lesson run, including reloads.
-- Pending/abandoned runs are reported separately; do not infer a successful transfer.
with events as (
 select * from public.learning_events where occurred_at >= current_date - interval '14 days'
 and curriculum_version='2026-10-01.2'
), advances as (
 select distinct on (learner_id,lesson_key,data->>'runStartedAt') * from events
 where name='support_changed' and data->>'reason'='advance' and data ? 'runStartedAt' and lesson>0
 order by learner_id,lesson_key,data->>'runStartedAt',occurred_at,id
), outcomes as (
 select a.id,
 exists(select 1 from events c where c.name='lesson_completed' and c.learner_id=a.learner_id
  and c.lesson_key=a.lesson_key and c.data->>'runStartedAt'=a.data->>'runStartedAt' and c.occurred_at>=a.occurred_at) as completed,
 exists(select 1 from events c where c.name='lesson_completed' and c.learner_id=a.learner_id
  and c.lesson_key=a.lesson_key and c.data->>'runStartedAt'=a.data->>'runStartedAt' and c.occurred_at>=a.occurred_at
  and c.data->>'independent'='true' and c.data->>'supportLevel'=a.data->>'nextSupport'
  and not exists(select 1 from events r where r.name='support_changed' and r.data->>'reason'='restore'
   and r.learner_id=a.learner_id and r.lesson_key=a.lesson_key and r.data->>'runStartedAt'=a.data->>'runStartedAt'
   and r.occurred_at>=a.occurred_at and r.occurred_at<=c.occurred_at)) as independent_success
 from advances a
)
select count(*) as support_advances,
 count(*) filter(where independent_success) as independent_after_advance,
 count(*) filter(where not completed) as advances_pending_or_abandoned,
 avg(case when independent_success then 1.0 else 0.0 end) as support_independence_rate
from outcomes;

-- Transfer Success uses a NEW task, not inferred lesson completion.
-- pilot-results.csv: successful no-hint/no-solution/no-oral-help transfers /
-- all attempted transfers. Report numerator, denominator and helped attempts separately.
