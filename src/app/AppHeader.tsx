import { Link } from 'react-router-dom'
import { BookIcon, PlusIcon } from '../components/ui/icons'

export function AppHeader() {
  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BookIcon className="text-lg" />
          </span>
          <span className="text-base">LKPD Builder</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <PlusIcon />
            Buat LKPD
          </Link>
        </nav>
      </div>
    </header>
  )
}
