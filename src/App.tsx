import { useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { Nav, type Tab } from './components/Nav'
import { ExcelImporter } from './components/ExcelImporter'
import { UserManagement } from './components/UserManagement/UserManagement'

function App() {
  const [tab, setTab] = useState<Tab>('importer')

  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Nav active={tab} onChange={setTab} />

        <main className="mx-auto max-w-6xl px-6 py-8">
          {tab === 'importer' ? <ExcelImporter /> : <UserManagement />}
        </main>
      </div>
    </AuthGate>
  )
}

export default App
