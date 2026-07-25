import { LayoutDashboard } from 'lucide-react'
import { ExcelImporter } from './components/ExcelImporter'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-4">
          <LayoutDashboard className="h-5 w-5 text-slate-500" />
          <h1 className="text-lg font-semibold">GRE Admin</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <ExcelImporter />
      </main>
    </div>
  )
}

export default App
