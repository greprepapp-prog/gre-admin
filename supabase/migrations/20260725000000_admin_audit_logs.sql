-- Admin audit log for Module 2 (User & Subscription Management).
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
-- Relies on the existing public.has_role(uuid, app_role) function and
-- app_role enum already used by user_roles / useIsAdmin elsewhere in the project.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_target_user_id_idx
  on public.admin_audit_logs (target_user_id);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
create policy "Admins can view audit logs"
  on public.admin_audit_logs
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;
create policy "Admins can insert audit logs"
  on public.admin_audit_logs
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin') and admin_id = auth.uid());
