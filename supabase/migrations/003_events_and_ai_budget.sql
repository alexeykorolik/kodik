-- Only server functions holding the service key may write or read these tables.
create table if not exists public.learning_events (
  id uuid primary key,
  learner_id text not null,
  session_id uuid not null,
  name text not null,
  lesson integer not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
create index if not exists learning_events_learner_time on public.learning_events(learner_id, occurred_at);
alter table public.learning_events enable row level security;
revoke all on public.learning_events from anon, authenticated;
grant select, insert on public.learning_events to service_role;

create table if not exists public.learning_budgets (
  bucket text primary key,
  used integer not null default 0,
  expires_at timestamptz not null
);
create index if not exists learning_budgets_expiry on public.learning_budgets(expires_at);
alter table public.learning_budgets enable row level security;
revoke all on public.learning_budgets from anon, authenticated;
grant all on public.learning_budgets to service_role;

-- Lock in a stable order. All limits are claimed together, including across instances.
create or replace function public.claim_learning_budget(p_buckets jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare item jsonb; current_used integer;
begin
  if jsonb_array_length(p_buckets) not between 1 and 6 then return false; end if;
  for item in select value from jsonb_array_elements(p_buckets) order by value->>'key' loop
    perform pg_advisory_xact_lock(hashtextextended(item->>'key', 0));
    select used into current_used from public.learning_budgets where bucket = item->>'key';
    if coalesce(current_used, 0) >= (item->>'limit')::integer then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_buckets) loop
    insert into public.learning_budgets(bucket, used, expires_at)
      values(item->>'key', 1, (item->>'expires')::timestamptz)
      on conflict(bucket) do update set used = public.learning_budgets.used + 1;
  end loop;
  delete from public.learning_budgets where expires_at < now();
  return true;
end $$;
revoke all on function public.claim_learning_budget(jsonb) from public, anon, authenticated;
grant execute on function public.claim_learning_budget(jsonb) to service_role;
