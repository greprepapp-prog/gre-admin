-- Module 4: Support & Messaging Hub.
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
--
-- NAMING NOTE: the project already has a `support_messages` table (flat
-- one-row-per-submission, used today by the mobile app's contact-admin
-- screen and the admin_list_support_messages() RPC). That table is left
-- completely untouched. This migration adds a separate, independent
-- threaded ticketing system: support_tickets + support_ticket_messages
-- (note the extra "ticket_" in the second name to avoid colliding with
-- the existing table). There is currently no user-facing "create a
-- ticket" flow in the mobile app — tickets are created from the admin
-- panel itself (e.g. logging a request that came in by email/phone).

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_updated_at_idx on public.support_tickets (updated_at desc);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  message_text text not null,
  is_admin_reply boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_id_idx on public.support_ticket_messages (ticket_id);
create index if not exists support_ticket_messages_created_at_idx on public.support_ticket_messages (created_at);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- Admin-only for now, since there's no customer-facing ticket UI yet.
-- If a self-service "contact support" screen is added to the mobile app
-- later, add a ticket-owner policy (user_id = auth.uid()) at that point.
drop policy if exists "Admins manage support tickets" on public.support_tickets;
create policy "Admins manage support tickets"
  on public.support_tickets
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins manage support ticket messages" on public.support_ticket_messages;
create policy "Admins manage support ticket messages"
  on public.support_ticket_messages
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Keep support_tickets.updated_at current whenever the ticket row itself
-- changes (e.g. status toggled), and also when a new message is posted
-- to it (so "last updated" in the ticket list reflects thread activity).

create or replace function public.touch_support_tickets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row
  execute function public.touch_support_tickets_updated_at();

create or replace function public.bump_ticket_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists support_ticket_messages_bump_ticket on public.support_ticket_messages;
create trigger support_ticket_messages_bump_ticket
  after insert on public.support_ticket_messages
  for each row
  execute function public.bump_ticket_on_new_message();

-- Live User Context Drawer: single-user aggregate (email/provider/signup
-- date from auth.users, tier from user_subscriptions, progress summary
-- from lesson_progress/exam_progress). Same SECURITY DEFINER + has_role
-- pattern as the Module 3 dashboard RPCs.
create or replace function public.get_admin_user_context(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'provider', coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
    'created_at', u.created_at,
    'is_banned', (u.banned_until is not null and u.banned_until > now()),
    'access_level', coalesce(s.access_level, 'free'),
    'plan_type', s.plan_type,
    'subscription_expires_at', s.expires_at,
    'lessons_completed', (
      select count(*) from public.lesson_progress where user_id = p_user_id and passed = true
    ),
    'lessons_started', (
      select count(distinct lesson_id) from public.lesson_progress where user_id = p_user_id
    ),
    'last_activity_at', (
      select max(x.completed_at) from (
        select completed_at from public.lesson_progress where user_id = p_user_id
        union all
        select completed_at from public.exam_progress where user_id = p_user_id
      ) x
    )
  )
  into v_result
  from auth.users u
  left join public.user_subscriptions s on s.user_id = u.id
  where u.id = p_user_id;

  return v_result;
end;
$$;

revoke execute on function public.get_admin_user_context(uuid) from public;
grant execute on function public.get_admin_user_context(uuid) to authenticated;

-- Quick action: "Extend Trial (+N days)". Extends from the later of "now"
-- or the current expiry (so it doesn't shorten an already-future expiry),
-- and only flips access_level to 'trial' if the user is currently on
-- 'free' — an already-paying ('active') user just gets more time, not a
-- downgrade in tier.
create or replace function public.admin_extend_trial(p_user_id uuid, p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current record;
  v_base timestamptz;
  v_new_expires timestamptz;
  v_new_access_level text;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  select access_level, expires_at into v_current
  from public.user_subscriptions
  where user_id = p_user_id;

  v_base := greatest(coalesce(v_current.expires_at, now()), now());
  v_new_expires := v_base + make_interval(days => p_days);
  v_new_access_level := case
    when coalesce(v_current.access_level, 'free') = 'free' then 'trial'
    else v_current.access_level
  end;

  insert into public.user_subscriptions (user_id, access_level, plan_type, expires_at, granted_by, updated_at)
  values (p_user_id, v_new_access_level, null, v_new_expires, auth.uid(), now())
  on conflict (user_id) do update set
    access_level = excluded.access_level,
    expires_at = excluded.expires_at,
    granted_by = excluded.granted_by,
    updated_at = now();

  insert into public.admin_audit_logs (admin_id, target_user_id, action, details)
  values (
    auth.uid(),
    p_user_id,
    'extend_trial',
    jsonb_build_object('days', p_days, 'new_access_level', v_new_access_level, 'new_expires_at', v_new_expires)
  );

  return jsonb_build_object('access_level', v_new_access_level, 'expires_at', v_new_expires);
end;
$$;

revoke execute on function public.admin_extend_trial(uuid, integer) from public;
grant execute on function public.admin_extend_trial(uuid, integer) to authenticated;

-- Quick action: "Reset Progress" — clears lesson_progress/exam_progress
-- for the user so they can restart from scratch. Destructive; audited.
create or replace function public.admin_reset_user_progress(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson_deleted integer;
  v_exam_deleted integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  delete from public.lesson_progress where user_id = p_user_id;
  get diagnostics v_lesson_deleted = row_count;

  delete from public.exam_progress where user_id = p_user_id;
  get diagnostics v_exam_deleted = row_count;

  insert into public.admin_audit_logs (admin_id, target_user_id, action, details)
  values (
    auth.uid(),
    p_user_id,
    'reset_progress',
    jsonb_build_object('lesson_progress_deleted', v_lesson_deleted, 'exam_progress_deleted', v_exam_deleted)
  );

  return jsonb_build_object('lesson_progress_deleted', v_lesson_deleted, 'exam_progress_deleted', v_exam_deleted);
end;
$$;

revoke execute on function public.admin_reset_user_progress(uuid) from public;
grant execute on function public.admin_reset_user_progress(uuid) to authenticated;
