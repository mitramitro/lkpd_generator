import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-800">Halaman tidak ditemukan</h1>
      <p className="mt-1 text-sm text-slate-500">Dokumen atau halaman yang Anda cari tidak ada.</p>
      <Link to="/" className="mt-6">
        <Button>Kembali ke Dashboard</Button>
      </Link>
    </div>
  )
}
