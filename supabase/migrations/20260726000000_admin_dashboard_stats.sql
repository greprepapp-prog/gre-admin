-- Module 3 dashboard analytics.
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
--
-- These are SECURITY DEFINER functions (same pattern as the existing
-- admin_list_support_messages / has_role functions) so an authenticated
-- admin can read aggregate stats across all users without needing broad
-- admin-wide SELECT policies on auth.users / lesson_progress /
-- user_subscriptions. Each function re-checks has_role(auth.uid(), 'admin')
-- itself, so it's safe even though EXECUTE is granted to `authenticated`.
--
-- ACTIVITY DEFINITION: there is no session/login-history table in this
-- schema, so:
--   - DAU / MAU use auth.users.last_sign_in_at (true sign-in activity,
--     but only reflects each user's MOST RECENT sign-in, not a full
--     history — fine for "how many users signed in today/this month").
--   - "Active sessions today" and the trend chart's active-user line use
--     lesson_progress/exam_progress.completed_at instead (distinct users
--     who actually completed something today), since that's the only
--     activity history actually recorded.
--
-- PRICING ASSUMPTION: estimated_mrr uses placeholder prices because
-- user_subscriptions has no price column. Adjust v_monthly_price /
-- v_yearly_price below to your real plan prices before trusting this
-- number.

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly_price numeric := 4.99;  -- TODO: set to your real monthly plan price
  v_yearly_price numeric := 39.99;  -- TODO: set to your real yearly plan price
  v_result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  select jsonb_build_object(
    'total_registrations', (select count(*) from auth.users),
    'dau', (select count(*) from auth.users where last_sign_in_at > now() - interval '1 day'),
    'mau', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'active_subscribers', (
      select count(*) from public.user_subscriptions
      where access_level = 'active' and (expires_at is null or expires_at > now())
    ),
    'active_trial_users', (
      select count(*) from public.user_subscriptions
      where access_level = 'trial' and (expires_at is null or expires_at > now())
    ),
    'estimated_mrr', (
      select coalesce(sum(
        case
          when lower(coalesce(plan_type, '')) = 'yearly' then v_yearly_price / 12
          when lower(coalesce(plan_type, '')) = 'monthly' then v_monthly_price
          else 0
        end
      ), 0)
      from public.user_subscriptions
      where access_level = 'active' and (expires_at is null or expires_at > now())
    ),
    'active_sessions_today', (
      select count(distinct user_id) from (
        select user_id from public.lesson_progress where completed_at::date = current_date
        union
        select user_id from public.exam_progress where completed_at::date = current_date
      ) s
    ),
    'avg_lessons_completed', (
      select case when (select count(*) from auth.users) = 0 then 0
        else round(
          (select count(*) from public.lesson_progress where passed = true)::numeric
          / (select count(*) from auth.users), 2
        )
      end
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_admin_dashboard_stats() from public;
grant execute on function public.get_admin_dashboard_stats() to authenticated;

-- Daily registration + activity trend, for the 7d/30d/90d line chart.
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
    select generate_series(current_date - (greatest(p_days, 1) - 1), current_date, interval '1 day')::date as day
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

-- Per-lesson completion rate, for the engagement bar chart.
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
  left join public.lesson_progress lp on lp.lesson_id = l.id
  group by l.id, l.title
  order by l.id;
end;
$$;

revoke execute on function public.get_admin_lesson_completion_rates() from public;
grant execute on function public.get_admin_lesson_completion_rates() to authenticated;
