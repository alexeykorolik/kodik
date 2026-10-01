-- Run as project administrator. No raw code or names are in this table.
-- Select the actual pilot dates before drawing conclusions.
with events as (
 select * from public.learning_events where occurred_at >= current_date - interval '14 days'
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
