-- Fix: the three Module 3 dashboard RPCs had been redefined directly in
-- the live database (outside these migration files) with a different,
-- incompatible shape:
--   get_admin_dashboard_stats:            total_users/dau/mau/active_subscribers/
--                                          trial_users/mrr — missing
--                                          active_sessions_today and
--                                          avg_lessons_completed entirely.
--   get_admin_registration_trend:         returned (date, signups) instead
--                                          of (day, registrations, active_users).
--   get_admin_lesson_completion_rates:    returned (lesson_id, completions)
--                                          instead of (lesson_id, title,
--                                          started_count, completed_count,
--                                          completion_rate).
-- The frontend called `.toLocaleString()` on the missing dashboard-stats
-- fields unconditionally, which threw during render and blanked the page
-- (no error boundary existed to catch it — see the frontend fix too).
--
-- This migration re-establishes ONE canonical shape that both the DB and
-- the frontend agree on: it adopts the field names used by the live
-- get_admin_dashboard_stats (total_users, trial_users, mrr) rather than
-- fighting them, but keeps active_sessions_today/avg_lessons_completed
-- since removing them would silently drop two dashboard stat cards nobody
-- asked to remove. Also adds defensive BEGIN/EXCEPTION guards around the
-- subscription/progress subqueries so a schema surprise degrades to 0
-- instead of erroring the whole function out.
--
-- Run this once in the Supabase SQL Editor (or via `supabase db push`),
-- then run: NOTIFY pgrst, 'reload schema';

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly_price numeric := 4.99;  -- TODO: set to your real monthly plan price
  v_yearly_price numeric := 39.99;  -- TODO: set to your real yearly plan price
  v_total_users integer := 0;
  v_dau integer := 0;
  v_mau integer := 0;
  v_active_subscribers integer := 0;
  v_trial_users integer := 0;
  v_mrr numeric := 0;
  v_active_sessions_today integer := 0;
  v_avg_lessons_completed numeric := 0;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  select count(*) into v_total_users from auth.users;

  select count(*) into v_dau from auth.users where last_sign_in_at >= now() - interval '1 day';
  select count(*) into v_mau from auth.users where last_sign_in_at >= now() - interval '30 days';

  begin
    select
      count(*) filter (where access_level = 'active' and (expires_at is null or expires_at > now())),
      count(*) filter (where access_level = 'trial' and (expires_at is null or expires_at > now()))
    into v_active_subscribers, v_trial_users
    from public.user_subscriptions;
  exception when others then
    v_active_subscribers := 0;
    v_trial_users := 0;
  end;

  begin
    select coalesce(sum(
      case
        when lower(coalesce(plan_type, '')) = 'yearly' then v_yearly_price / 12
        when lower(coalesce(plan_type, '')) = 'monthly' then v_monthly_price
        else 0
      end
    ), 0)
    into v_mrr
    from public.user_subscriptions
    where access_level = 'active' and (expires_at is null or expires_at > now());
  exception when others then
    v_mrr := 0;
  end;

  begin
    select count(distinct user_id) into v_active_sessions_today from (
      select user_id from public.lesson_progress where completed_at::date = current_date
      union
      select user_id from public.exam_progress where completed_at::date = current_date
    ) s;
  exception when others then
    v_active_sessions_today := 0;
  end;

  begin
    select case when v_total_users = 0 then 0
      else round((select count(*) from public.lesson_progress where passed = true)::numeric / v_total_users, 2)
    end into v_avg_lessons_completed;
  exception when others then
    v_avg_lessons_completed := 0;
  end;

  return jsonb_build_object(
    'total_users', coalesce(v_total_users, 0),
    'dau', coalesce(v_dau, 0),
    'mau', coalesce(v_mau, 0),
    'active_subscribers', coalesce(v_active_subscribers, 0),
    'trial_users', coalesce(v_trial_users, 0),
    'mrr', coalesce(v_mrr, 0),
    'active_sessions_today', coalesce(v_active_sessions_today, 0),
    'avg_lessons_completed', coalesce(v_avg_lessons_completed, 0)
  );
end;
$$;

revoke execute on function public.get_admin_dashboard_stats() from public;
grant execute on function public.get_admin_dashboard_stats() to authenticated;

-- The live function's return row shape (date, signups) differs from ours
-- (day, registrations, active_users) -- CREATE OR REPLACE can't change a
-- function's OUT-parameter row type, so it must be dropped first.
drop function if exists public.get_admin_registration_trend(integer);

create or replace function public.get_admin_registration_trend(p_days integer default 30)
returns table (day date, registrations bigint, active_users bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  return query
  with days as (
    select generate_series(current_date - (greatest(coalesce(p_days, 30), 1) - 1), current_date, interval '1 day')::date as day
  ),
  regs as (
    select created_at::date as reg_day, count(*) as registrations
    from auth.users
    group by 1
  ),
  activity as (
    select completed_at::date as active_day, count(distinct user_id) as active_users
    from (
      select user_id, completed_at from public.lesson_progress
      union all
      select user_id, completed_at from public.exam_progress
    ) a
    group by 1
  )
  select
    d.day,
    coalesce(r.registrations, 0) as registrations,
    coalesce(a.active_users, 0) as active_users
  from days d
  left join regs r on r.reg_day = d.day
  left join activity a on a.active_day = d.day
  order by d.day;
end;
$$;

revoke execute on function public.get_admin_registration_trend(integer) from public;
grant execute on function public.get_admin_registration_trend(integer) to authenticated;

-- Same reasoning: the live function's row shape (lesson_id text,
-- completions bigint) differs from ours, so drop before recreating.
drop function if exists public.get_admin_lesson_completion_rates();

create or replace function public.get_admin_lesson_completion_rates()
returns table (lesson_id integer, title text, started_count bigint, completed_count bigint, completion_rate numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  return query
  select
    l.id as lesson_id,
    l.title,
    count(distinct lp.user_id) as started_count,
    count(distinct lp.user_id) filter (where lp.passed) as completed_count,
    case when count(distinct lp.user_id) = 0 then 0
      else round(
        (count(distinct lp.user_id) filter (where lp.passed))::numeric
        / count(distinct lp.user_id) * 100, 1
      )
    end as completion_rate
  from public.lessons l
  left join public.lesson_progress lp on lp.lesson_id = l.id and lp.completed_at is not null
  group by l.id, l.title
  order by l.id;
end;
$$;

revoke execute on function public.get_admin_lesson_completion_rates() from public;
grant execute on function public.get_admin_lesson_completion_rates() to authenticated;

notify pgrst, 'reload schema';
