// Teks dan helper terkait penyimpanan lokal untuk UI (bahasa non-teknis).

export const STORAGE_COPY =
  'LKPD tersimpan di perangkat ini. Untuk menghindari kehilangan data jika data browser terhapus atau perangkat bermasalah, download file .LKPD sebagai backup.'

export const STORAGE_LIMIT_COPY =
  'Jumlah penyimpanan bergantung pada ruang yang tersedia di perangkat/browser.'

export function storageFailureMessage(): string {
  return 'Penyimpanan perangkat hampir penuh. Silakan buat backup .LKPD dan hapus project/gambar yang tidak diperlukan.'
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export interface StorageEstimate {
  usage: number
  quota: number
}

// Opsional: estimasi pemakaian penyimpanan origin. Kembalikan null jika API
// browser tidak tersedia/konsisten.
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  try {
    const storage = globalThis.navigator?.storage
    if (!storage || typeof storage.estimate !== 'function') return null
    const estimate = await storage.estimate()
    if (typeof estimate.usage !== 'number' || typeof estimate.quota !== 'number') return null
    return { usage: estimate.usage, quota: estimate.quota }
  } catch {
    return null
  }
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return 'Belum pernah dibackup'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Belum pernah dibackup'
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
