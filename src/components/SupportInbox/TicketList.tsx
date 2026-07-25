import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { SupportTicket, TicketStatus } from '../../lib/supportApi'
import { PRIORITY_STYLES, STATUS_STYLES, capitalize } from './badges'

const STATUS_TABS: (TicketStatus | 'all')[] = ['all', 'open', 'pending', 'resolved']

interface Props {
  tickets: SupportTicket[]
  emailByUserId: Map<string, string | null>
  selectedTicketId: string | null
  onSelect: (id: string) => void
  onNewTicket: () => void
}

export function TicketList({ tickets, emailByUserId, selectedTicketId, onSelect, onNewTicket }: Props) {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (!term) return true
      const email = (emailByUserId.get(t.user_id) ?? '').toLowerCase()
      return t.subject.toLowerCase().includes(term) || email.includes(term)
    })
  }, [tickets, statusFilter, search, emailByUserId])

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Tickets</h3>
          <button
            type="button"
            onClick={onNewTicket}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject or email"
            className="w-full rounded-md border border-slate-300 py-1.5 pl-7 pr-2 text-xs"
          />
        </div>

        <div className="flex gap-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={
                statusFilter === s
                  ? 'rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white'
                  : 'rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100'
              }
            >
              {s === 'all' ? 'All' : capitalize(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="p-4 text-center text-xs text-slate-400">No tickets match.</p>}
        <ul className="divide-y divide-slate-100">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={
                  selectedTicketId === t.id
                    ? 'block w-full bg-slate-50 px-3 py-2.5 text-left'
                    : 'block w-full px-3 py-2.5 text-left hover:bg-slate-50'
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{t.subject}</p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[t.priority]}`}>
                    {capitalize(t.priority)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">{emailByUserId.get(t.user_id) ?? t.user_id}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[t.status]}`}>
                    {capitalize(t.status)}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(t.updated_at).toLocaleString()}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
