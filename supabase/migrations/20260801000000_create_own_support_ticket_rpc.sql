-- Diagnostic/fix for the mobile Contact Support RLS failure.
--
-- The existing self-service policies (user_id = auth.uid() on
-- support_tickets, sender_id = auth.uid() on support_ticket_messages)
-- are still in place and verified correct in pg_policies - but real
-- mobile sessions keep failing that exact comparison even with a
-- server-validated (getUser()) session, while the structurally
-- identical admin_id = auth.uid() comparison already works reliably
-- for every admin action in this app. Rather than keep guessing at why
-- that specific WITH CHECK comparison misbehaves for mobile sessions,
-- this RPC sidesteps it: auth.uid() is read once, server-side, inside
-- a SECURITY DEFINER function, with no client-supplied value compared
-- against it at all - so this class of mismatch is structurally
-- impossible here, whatever its root cause turns out to be.
--
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

create or replace function public.create_own_support_ticket(p_subject text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to submit a support request.';
  end if;

  if coalesce(trim(p_subject), '') = '' or coalesce(trim(p_message), '') = '' then
    raise exception 'Subject and message are required.';
  end if;

  insert into public.support_tickets (user_id, subject)
  values (v_user_id, p_subject)
  returning id into v_ticket_id;

  insert into public.support_ticket_messages (ticket_id, sender_id, message_text, is_admin_reply)
  values (v_ticket_id, v_user_id, p_message, false);

  return v_ticket_id;
end;
$$;

revoke execute on function public.create_own_support_ticket(text, text) from public;
grant execute on function public.create_own_support_ticket(text, text) to authenticated;
