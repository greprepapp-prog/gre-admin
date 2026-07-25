-- Module 5: Dynamic CMS & Operations.
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
--
-- NAMING NOTE: the mobile app already has its own in-app admin screen at
-- /admin/broadcast that sends "to all users" by inserting into the
-- existing `announcements` table (title, body, created_by only). That
-- table and screen are left completely untouched. `app_announcements`
-- below is a deliberately separate, richer table (banner_type, is_active,
-- target_segment) for this admin panel. The two systems are independent
-- going forward — banners created here won't show up to end users unless
-- the mobile app is later updated to also read from app_announcements.
--
-- feature_flags and the notifications-based broadcast RPC have no
-- existing equivalent, so there's no similar collision to avoid there.

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null unique,
  description text,
  is_enabled boolean not null default false,
  variant_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  banner_type text not null default 'info' check (banner_type in ('info', 'warning', 'promo')),
  is_active boolean not null default false,
  target_segment text,
  created_at timestamptz not null default now()
);

create index if not exists app_announcements_is_active_idx on public.app_announcements (is_active);

alter table public.feature_flags enable row level security;
alter table public.app_announcements enable row level security;

-- Flags/banners must be readable by every app user (even signed-out, for
-- things like maintenance_mode), so SELECT is public. Only admins may
-- write. This is the opposite shape from every other admin-only table in
-- this project (support_tickets, admin_audit_logs, etc).
drop policy if exists "Feature flags are publicly readable" on public.feature_flags;
create policy "Feature flags are publicly readable"
  on public.feature_flags
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins insert feature flags" on public.feature_flags;
create policy "Admins insert feature flags"
  on public.feature_flags
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update feature flags" on public.feature_flags;
create policy "Admins update feature flags"
  on public.feature_flags
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete feature flags" on public.feature_flags;
create policy "Admins delete feature flags"
  on public.feature_flags
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Announcements are publicly readable" on public.app_announcements;
create policy "Announcements are publicly readable"
  on public.app_announcements
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins insert announcements" on public.app_announcements;
create policy "Admins insert announcements"
  on public.app_announcements
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update announcements" on public.app_announcements;
create policy "Admins update announcements"
  on public.app_announcements
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete announcements" on public.app_announcements;
create policy "Admins delete announcements"
  on public.app_announcements
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_feature_flags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feature_flags_set_updated_at on public.feature_flags;
create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row
  execute function public.touch_feature_flags_updated_at();

-- Seed the three example flags mentioned in the spec so the panel isn't
-- empty on first load. Safe to re-run: does nothing if they already exist.
insert into public.feature_flags (flag_key, description, is_enabled, variant_config)
values
  ('paywall_ab_variant', 'Paywall A/B test variant assignment', true, '{"variants": ["control", "discount_first"], "split": [50, 50]}'::jsonb),
  ('enable_discount_banner', 'Show the discount promo banner on the paywall', false, '{}'::jsonb),
  ('maintenance_mode', 'Show maintenance screen and block app usage', false, '{}'::jsonb)
on conflict (flag_key) do nothing;

-- Notification Dispatcher: broadcasts into the existing per-user
-- `notifications` table (unused by any admin surface today) for a
-- resolved segment of users. Same SECURITY DEFINER + has_role pattern as
-- the Module 3/4 RPCs; audited like every other admin action.
create or replace function public.admin_broadcast_notification(
  p_segment text,
  p_title text,
  p_body text,
  p_type text default 'system',
  p_link text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_count integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  if p_segment not in ('all', 'free', 'active_trial', 'inactive_7d') then
    raise exception 'Unknown segment: %', p_segment;
  end if;

  with target_users as (
    select u.id
    from auth.users u
    left join public.user_subscriptions s on s.user_id = u.id
    where
      (p_segment = 'all')
      or (p_segment = 'free' and coalesce(s.access_level, 'free') = 'free')
      or (p_segment = 'active_trial' and s.access_level = 'trial' and (s.expires_at is null or s.expires_at > now()))
      or (
        p_segment = 'inactive_7d'
        and not exists (
          select 1 from public.lesson_progress lp where lp.user_id = u.id and lp.completed_at > now() - interval '7 days'
        )
        and not exists (
          select 1 from public.exam_progress ep where ep.user_id = u.id and ep.completed_at > now() - interval '7 days'
        )
      )
  )
  insert into public.notifications (user_id, title, body, type, link)
  select id, p_title, p_body, p_type::public.notif_type, p_link from target_users;

  get diagnostics v_recipient_count = row_count;

  insert into public.admin_audit_logs (admin_id, target_user_id, action, details)
  values (
    auth.uid(),
    null,
    'broadcast_notification',
    jsonb_build_object('segment', p_segment, 'title', p_title, 'type', p_type, 'recipient_count', v_recipient_count)
  );

  return jsonb_build_object('recipient_count', v_recipient_count);
end;
$$;

revoke execute on function public.admin_broadcast_notification(text, text, text, text, text) from public;
grant execute on function public.admin_broadcast_notification(text, text, text, text, text) to authenticated;
