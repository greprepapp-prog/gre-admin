import { Loader2, Send } from 'lucide-react'
import type { SupportTicket, SupportTicketMessage, TicketStatus } from '../../lib/supportApi'
import { STATUS_STYLES, capitalize } from './badges'

interface Props {
  ticket: SupportTicket | null
  messages: SupportTicketMessage[]
  messagesLoading: boolean
  requesterEmail: string | null
  replyText: string
  onReplyTextChange: (text: string) => void
  onSend: () => void
  sending: boolean
  onStatusChange: (status: TicketStatus) => void
  statusUpdating: boolean
}

export function TicketThread({
  ticket,
  messages,
  messagesLoading,
  requesterEmail,
  replyText,
  onReplyTextChange,
  onSend,
  sending,
  onStatusChange,
  statusUpdating,
}: Props) {
  if (!ticket) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
        Select a ticket to view the conversation.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{ticket.subject}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{requesterEmail ?? ticket.user_id}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
            {capitalize(ticket.status)}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          {ticket.status !== 'resolved' && (
            <button
              type="button"
              onClick={() => onStatusChange('resolved')}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              {statusUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
              Mark as Resolved
            </button>
          )}
          {ticket.status === 'resolved' && (
            <button
              type="button"
              onClick={() => onStatusChange('open')}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {statusUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
              Reopen
            </button>
          )}
          {ticket.status === 'open' && (
            <button
              type="button"
              onClick={() => onStatusChange('pending')}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Mark Pending
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messagesLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-slate-400">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                  m.is_admin_reply
                    ? 'max-w-[75%] rounded-lg bg-slate-900 px-3 py-2 text-sm text-white'
                    : 'max-w-[75%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800'
                }
              >
                <p className="whitespace-pre-wrap">{m.message_text}</p>
                <p className={m.is_admin_reply ? 'mt-1 text-[10px] text-slate-300' : 'mt-1 text-[10px] text-slate-400'}>
                  {m.is_admin_reply ? 'Admin' : 'User'} · {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <textarea
          value={replyText}
          onChange={(e) => onReplyTextChange(e.target.value)}
          rows={3}
          placeholder="Type a reply…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onSend}
            disabled={!replyText.trim() || sending}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
