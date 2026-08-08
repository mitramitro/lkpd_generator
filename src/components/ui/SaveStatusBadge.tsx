import type { SaveStatus } from '../../store/documentStore'

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: 'Tersimpan di perangkat',
  pending: 'Menunggu penyimpanan…',
  saving: 'Menyimpan…',
  error: 'Gagal menyimpan',
}

const STATUS_CLASS: Record<SaveStatus, string> = {
  saved: 'text-emerald-600',
  pending: 'text-slate-500',
  saving: 'text-amber-600',
  error: 'text-red-600',
}

interface SaveStatusBadgeProps {
  status: SaveStatus
  error?: string | null
}

// Indikator sederhana apakah pekerjaan guru sudah tersimpan (auto-save).
export function SaveStatusBadge({ status, error }: SaveStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${STATUS_CLASS[status]}`}
      title={status === 'error' && error ? error : undefined}
      role="status"
    >
      {status === 'saved' && '✓'}
      {status === 'error' && '⚠'}
      {STATUS_TEXT[status]}
    </span>
  )
}
