import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { listAdminUsers, type AdminUserRow } from '../../lib/adminApi'
import {
  getUserContext,
  listTicketMessages,
  listTickets,
  sendReply,
  updateTicketStatus,
  type SupportTicket,
  type SupportTicketMessage,
  type TicketStatus,
  type UserContext,
} from '../../lib/supportApi'
import { useAuth } from '../../hooks/use-auth'
import { TicketList } from './TicketList'
import { TicketThread } from './TicketThread'
import { UserContextSidebar } from './UserContextSidebar'
import { NewTicketModal } from './NewTicketModal'

export function SupportInbox() {
  const { user: currentAdmin } = useAuth()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState<string | null>(null)

  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([])

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportTicketMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)

  const [showNewTicketModal, setShowNewTicketModal] = useState(false)

  const emailByUserId = useMemo(() => new Map(adminUsers.map((u) => [u.id, u.email])), [adminUsers])
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null

  async function loadTickets() {
    setTicketsLoading(true)
    setTicketsError(null)
    try {
      setTickets(await listTickets())
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : 'Failed to load tickets.')
    } finally {
      setTicketsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    listAdminUsers()
      .then(({ users }) => setAdminUsers(users))
      .catch(() => setAdminUsers([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedTicket) return

    setMessagesLoading(true)
    listTicketMessages(selectedTicket.id)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false))

    loadUserContext(selectedTicket.user_id)
    setReplyText('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?.id])

  function loadUserContext(userId: string) {
    setContextLoading(true)
    setContextError(null)
    getUserContext(userId)
      .then(setUserContext)
      .catch((err) => setContextError(err instanceof Error ? err.message : 'Failed to load user context.'))
      .finally(() => setContextLoading(false))
  }

  async function handleSend() {
    if (!selectedTicket || !currentAdmin || !replyText.trim()) return
    setSending(true)
    try {
      await sendReply(selectedTicket.id, currentAdmin.id, replyText.trim())
      setReplyText('')
      setMessages(await listTicketMessages(selectedTicket.id))
      setTickets(await listTickets())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reply.')
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!selectedTicket) return
    setStatusUpdating(true)
    try {
      await updateTicketStatus(selectedTicket.id, status)
      setTickets(await listTickets())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setStatusUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Support Inbox</h2>
        <p className="mt-1 text-sm text-slate-500">Respond to tickets and manage user accounts in one place.</p>
      </div>

      {ticketsError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {ticketsError}
        </div>
      )}

      {ticketsLoading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid h-[calc(100vh-220px)] min-h-[500px] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_280px]">
          <TicketList
            tickets={tickets}
            emailByUserId={emailByUserId}
            selectedTicketId={selectedTicketId}
            onSelect={setSelectedTicketId}
            onNewTicket={() => setShowNewTicketModal(true)}
          />

          <TicketThread
            ticket={selectedTicket}
            messages={messages}
            messagesLoading={messagesLoading}
            requesterEmail={selectedTicket ? (emailByUserId.get(selectedTicket.user_id) ?? null) : null}
            replyText={replyText}
            onReplyTextChange={setReplyText}
            onSend={handleSend}
            sending={sending}
            onStatusChange={handleStatusChange}
            statusUpdating={statusUpdating}
          />

          {selectedTicket ? (
            <UserContextSidebar
              userId={selectedTicket.user_id}
              context={userContext}
              loading={contextLoading}
              error={contextError}
              onRefreshContext={() => loadUserContext(selectedTicket.user_id)}
              onInsertCannedResponse={(text) => setReplyText(text)}
            />
          ) : (
            <div className="hidden rounded-lg border border-slate-200 bg-white lg:block" />
          )}
        </div>
      )}

      {showNewTicketModal && (
        <NewTicketModal
          users={adminUsers}
          onClose={() => setShowNewTicketModal(false)}
          onCreated={(ticketId) => {
            setShowNewTicketModal(false)
            loadTickets().then(() => setSelectedTicketId(ticketId))
          }}
        />
      )}
    </div>
  )
}
