-- Connects the mobile app's Contact Support screen to the admin panel's
-- Support Inbox (Module 4). support_tickets/support_ticket_messages were
-- admin-only until now (see that migration's own comment anticipating
-- this exact moment: "If a self-service 'contact support' screen is added
-- to the mobile app later, add a ticket-owner policy at that point").
--
-- Scoped to `authenticated` only, not `anon`: the mobile Contact Support
-- screen already requires a signed-in user (`if (!user) return;`) - there
-- is no actual anonymous-submission path in the app to support, so opening
-- anon INSERT here would just be unused attack surface.
--
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

drop policy if exists "Users can create their own tickets" on public.support_tickets;
create policy "Users can create their own tickets"
  on public.support_tickets
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can send the first message on their own ticket" on public.support_ticket_messages;
create policy "Users can send the first message on their own ticket"
  on public.support_ticket_messages
  for insert
  to authenticated
  with check (
    is_admin_reply = false
    and sender_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );
