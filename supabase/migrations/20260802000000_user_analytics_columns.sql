-- User-analytics fields surfaced in the admin User Management table:
-- platform, app_open_count, last_practiced_at, referral.
-- The mobile app writes these (see gre-movie-native: record_app_open RPC,
-- lesson-finish last_practiced_at stamp, ?ref= referral capture).

alter table public.profiles
  add column if not exists platform text,
  add column if not exists app_open_count integer not null default 0,
  add column if not exists last_opened_at timestamptz,
  add column if not exists last_practiced_at timestamptz,
  add column if not exists referral text;

-- Atomic per-open bump; a client read-modify-write would lose updates across
-- concurrent sessions/devices, a single UPDATE won't.
create or replace function public.record_app_open(p_platform text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set app_open_count = coalesce(app_open_count, 0) + 1,
         last_opened_at  = now(),
         platform        = coalesce(p_platform, platform)
   where id = auth.uid();
$$;

grant execute on function public.record_app_open(text) to authenticated;
