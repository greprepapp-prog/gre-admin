import { useState } from 'react'
import { FeatureFlagsPanel } from './FeatureFlagsPanel'
import { AnnouncementsPanel } from './AnnouncementsPanel'
import { NotificationDispatcher } from './NotificationDispatcher'

type SubTab = 'flags' | 'announcements' | 'dispatcher'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'flags', label: 'Feature Flags' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'dispatcher', label: 'Notification Dispatcher' },
]

export function OperationsPanel() {
  const [subTab, setSubTab] = useState<SubTab>('flags')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Operations & Config</h2>
        <p className="mt-1 text-sm text-slate-500">Feature flags, in-app announcements, and broadcast messaging.</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={
                subTab === t.id
                  ? 'border-b-2 border-slate-900 px-1 py-2 text-sm font-medium text-slate-900'
                  : 'border-b-2 border-transparent px-1 py-2 text-sm font-medium text-slate-500 hover:text-slate-700'
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {subTab === 'flags' && <FeatureFlagsPanel />}
      {subTab === 'announcements' && <AnnouncementsPanel />}
      {subTab === 'dispatcher' && <NotificationDispatcher />}
    </div>
  )
}
