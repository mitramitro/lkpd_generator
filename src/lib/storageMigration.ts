import type { LKPDDocument } from '../models/lkpd'
import type { LKPDRepository } from '../services/repository'
import { isRecord } from './lkpdValidation'
import { materializeDataUrls } from './imageStorage'

const LOCAL_STORAGE_DOCUMENTS_KEY = 'lkpd-builder.documents.v1'
const MIGRATION_FLAG = 'storage.migration.localstorage.indexeddb'

// Migrasi sekali jalan: localStorage -> IndexedDB.
// - localStorage TIDAK dihapus (dihapus hanya oleh user / tidak pernah).
// - Flag ditulis hanya setelah proses selesai dijalankan, supaya tidak
//   berulang setiap boot.
export async function migrateLocalStorageToIndexedDb(repo: LKPDRepository): Promise<void> {
  if (!repo.supportsBlobImages) return

  const alreadyDone = await repo.getMeta(MIGRATION_FLAG)
  if (alreadyDone) return

  let raw = ''
  try {
    raw = globalThis.localStorage?.getItem(LOCAL_STORAGE_DOCUMENTS_KEY) ?? ''
  } catch {
    raw = ''
  }

  if (raw) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!isRecord(item)) continue
        try {
          const materialized = await materializeDataUrls(item as unknown as LKPDDocument, repo)
          await repo.save(materialized)
        } catch (error) {
          // Satu dokumen gagal tidak menghentikan migrasi dokumen lain.
          console.warn('Migrasi dokumen dari localStorage gagal, dilewati:', error)
        }
      }
    }
  }

  await repo.setMeta(MIGRATION_FLAG, new Date().toISOString())
}
