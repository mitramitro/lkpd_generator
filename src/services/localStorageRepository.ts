import type { LKPDDocument } from '../models/lkpd'
import type { LKPDRepository, StoredImage } from './repository'

const STORAGE_KEY = 'lkpd-builder.documents.v1'
const META_PREFIX = 'lkpd-builder.meta.'

function readAll(): LKPDDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LKPDDocument[]) : []
  } catch {
    return []
  }
}

// Melempar error saat kuota penuh supaya save status UI bisa menampilkan
// pesan yang jelas (storage error) alih-alih menyimpan secara diam-diam.
function writeAll(documents: LKPDDocument[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
}

// Mode fallback ketika IndexedDB tidak tersedia. Tidak mendukung penyimpanan
// Blob; gambar tetap disimpan inline sebagai data URL (perilaku lama).
export class LocalStorageRepository implements LKPDRepository {
  readonly name = 'localstorage'
  readonly supportsBlobImages = false

  async init(): Promise<void> {}

  async list(): Promise<LKPDDocument[]> {
    return readAll()
  }

  async get(id: string): Promise<LKPDDocument | undefined> {
    return readAll().find((document) => document.id === id)
  }

  async save(document: LKPDDocument): Promise<void> {
    const all = readAll()
    const index = all.findIndex((item) => item.id === document.id)
    if (index === -1) {
      all.push(document)
    } else {
      all[index] = document
    }
    writeAll(all)
  }

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((document) => document.id !== id))
  }

  async saveImage(_record: StoredImage): Promise<void> {
    throw new Error('Penyimpanan Blob tidak didukung pada mode localStorage.')
  }

  async getImage(_id: string): Promise<StoredImage | undefined> {
    return undefined
  }

  async deleteImage(_id: string): Promise<void> {}

  async listImages(): Promise<StoredImage[]> {
    return []
  }

  async listImagesByDocument(_documentId: string): Promise<StoredImage[]> {
    return []
  }

  async deleteImagesByDocument(_documentId: string): Promise<void> {}

  async getMeta(key: string): Promise<string | undefined> {
    try {
      return localStorage.getItem(`${META_PREFIX}${key}`) ?? undefined
    } catch {
      return undefined
    }
  }

  async setMeta(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(`${META_PREFIX}${key}`, value)
    } catch {
      // abaikan saat kuota penuh; flag hanya penanda migrasi
    }
  }
}

export const lkpdRepository = new LocalStorageRepository()
