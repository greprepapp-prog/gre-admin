-- Delete User feature.
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
--
-- Checked actual FK constraints into auth.users via pg_constraint before
-- writing this (the request's example table list included "user_profiles",
-- which doesn't exist — the real table is `profiles`). Only these public
-- tables have an ON DELETE CASCADE FK to auth.users today, so they clean
-- themselves up automatically when the auth.users row is deleted below:
--   profiles, support_tickets, support_ticket_messages, user_onboarding
-- Everything else referencing a user has NO FK constraint at all, so it's
-- deleted explicitly here to avoid orphaned rows.
--
-- admin_audit_logs is deliberately NOT touched: it's a historical record
-- of admin actions, and a row remains meaningful ("user X was banned on
-- this date by this admin") even after the account is gone. There's no FK
-- constraint on it, so leaving old user ids in there breaks nothing.
--
-- Deletion is done as plain SQL (DELETE FROM auth.users ...) inside this
-- one function/transaction, rather than calling the GoTrue admin API
-- (auth.admin.deleteUser) from an edge function — that would split the
-- app-table cleanup and the actual user deletion across two separate
-- network calls, where a failure between them could leave a half-deleted
-- user. Doing it all in one plpgsql function is atomic: either everything
-- below commits, or none of it does.

create or replace function public.delete_user_by_admin(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot delete your own account.';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'User not found.';
  end if;

  delete from public.user_roles where user_id = target_user_id;
  delete from public.user_subscriptions where user_id = target_user_id;
  delete from public.lesson_progress where user_id = target_user_id;
  delete from public.exam_progress where user_id = target_user_id;
  delete from public.user_words where user_id = target_user_id;
  delete from public.user_achievements where user_id = target_user_id;
  delete from public.notifications where user_id = target_user_id;
  delete from public.support_messages where user_id = target_user_id;

  -- Cascades into profiles, support_tickets, support_ticket_messages,
  -- user_onboarding, and Supabase's own internal auth.* tables
  -- (identities, sessions, mfa_factors, oauth_*, one_time_tokens,
  -- webauthn_*), all of which already have ON DELETE CASCADE set.
  delete from auth.users where id = target_user_id;

  insert into public.admin_audit_logs (admin_id, target_user_id, action, details)
  values (auth.uid(), target_user_id, 'delete_user', '{}'::jsonb);

  return jsonb_build_object('deleted', true, 'user_id', target_user_id);
end;
$$;

revoke execute on function public.delete_user_by_admin(uuid) from public;
grant execute on function public.delete_user_by_admin(uuid) to authenticated;
