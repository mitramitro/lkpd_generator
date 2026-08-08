import type { LKPDRepository } from './repository'
import { createIndexedDbRepository } from './indexedDbRepository'
import { lkpdRepository } from './localStorageRepository'
import { migrateLocalStorageToIndexedDb } from '../lib/storageMigration'

// Provider tunggal repository. Mode default: IndexedDB; fallback: localStorage.
// Komponen/store tidak perlu tahu backend mana yang dipakai.

let repositoryPromise: Promise<LKPDRepository> | null = null

export async function getRepository(): Promise<LKPDRepository> {
  if (!repositoryPromise) repositoryPromise = createRepository()
  try {
    return await repositoryPromise
  } catch (error) {
    // Jangan menyimpan promise yang rejected: kegagalan sementara (mis. migrasi)
    // tidak boleh membuat semua penyimpanan berikutnya selalu gagal.
    repositoryPromise = null
    throw error
  }
}

export function resetRepository(): void {
  repositoryPromise = null
}

export function indexedDbAvailable(): boolean {
  return typeof globalThis.indexedDB !== 'undefined'
}

// Terpisah agar mudah diuji: tanpa IndexedDB di Node -> fallback localStorage.
export async function createRepository(): Promise<LKPDRepository> {
  const idb = await createIndexedDbRepository()
  if (idb) {
    try {
      await migrateLocalStorageToIndexedDb(idb)
    } catch (error) {
      // Migrasi gagal tidak boleh mematikan penyimpanan: tetap pakai IndexedDB.
      console.warn('Migrasi localStorage -> IndexedDB gagal, lanjut dengan IndexedDB:', error)
    }
    return idb
  }
  return lkpdRepository
}
