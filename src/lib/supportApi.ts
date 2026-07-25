import { supabase } from './supabase'

export type TicketStatus = 'open' | 'pending' | 'resolved'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  category: string | null
  created_at: string
  updated_at: string
}

export interface SupportTicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message_text: string
  is_admin_reply: boolean
  created_at: string
}

export interface UserContext {
  id: string
  email: string | null
  provider: string
  created_at: string
  is_banned: boolean
  access_level: string
  plan_type: string | null
  subscription_expires_at: string | null
  lessons_completed: number
  lessons_started: number
  last_activity_at: string | null
}

export async function listTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as SupportTicket[]
}

export async function listTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as SupportTicketMessage[]
}

export interface CreateTicketInput {
  userId: string
  subject: string
  category: string | null
  priority: TicketPriority
  initialMessage: string
}

export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: input.userId,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
    })
    .select('*')
    .single()

  if (ticketError || !ticket) throw new Error(ticketError?.message ?? 'Failed to create ticket')

  if (input.initialMessage.trim()) {
    const { error: messageError } = await supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: input.userId,
      message_text: input.initialMessage.trim(),
      is_admin_reply: false,
    })
    if (messageError) throw new Error(messageError.message)
  }

  return ticket as SupportTicket
}

export async function sendReply(ticketId: string, adminId: string, text: string): Promise<void> {
  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: adminId,
    message_text: text,
    is_admin_reply: true,
  })
  if (error) throw new Error(error.message)
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId)
  if (error) throw new Error(error.message)
}

export async function getUserContext(userId: string): Promise<UserContext> {
  const { data, error } = await supabase.rpc('get_admin_user_context', { p_user_id: userId })
  if (error) throw new Error(error.message)
  return data as UserContext
}

export async function extendTrial(userId: string, days = 7): Promise<{ access_level: string; expires_at: string }> {
  const { data, error } = await supabase.rpc('admin_extend_trial', { p_user_id: userId, p_days: days })
  if (error) throw new Error(error.message)
  return data
}

export async function resetProgress(
  userId: string,
): Promise<{ lesson_progress_deleted: number; exam_progress_deleted: number }> {
  const { data, error } = await supabase.rpc('admin_reset_user_progress', { p_user_id: userId })
  if (error) throw new Error(error.message)
  return data
}
