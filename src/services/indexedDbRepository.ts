import type { LKPDDocument } from '../models/lkpd'
import type { LKPDRepository, StoredImage } from './repository'
import { IndexedDbBackend, type DbBackend } from './dbBackend'

// Repository IndexedDB. Dokumen disimpan terstruktur per record (bukan satu
// object besar), dan gambar disimpan terpisah sebagai Blob.
export class IndexedDbRepository implements LKPDRepository {
  readonly name = 'indexeddb'
  readonly supportsBlobImages = true

  private readonly db: DbBackend

  constructor(db: DbBackend) {
    this.db = db
  }

  async init(): Promise<void> {
    // Database dibuka oleh factory createIndexedDbRepository().
  }

  async list(): Promise<LKPDDocument[]> {
    return this.db.getAll<LKPDDocument>('documents')
  }

  async get(id: string): Promise<LKPDDocument | undefined> {
    return this.db.get<LKPDDocument>('documents', id)
  }

  async save(document: LKPDDocument): Promise<void> {
    await this.db.put('documents', document)
  }

  async remove(id: string): Promise<void> {
    await this.db.delete('documents', id)
  }

  async saveImage(record: StoredImage): Promise<void> {
    await this.db.put('images', record)
  }

  async getImage(id: string): Promise<StoredImage | undefined> {
    return this.db.get<StoredImage>('images', id)
  }

  async deleteImage(id: string): Promise<void> {
    await this.db.delete('images', id)
  }

  async listImages(): Promise<StoredImage[]> {
    return this.db.getAll<StoredImage>('images')
  }

  async listImagesByDocument(documentId: string): Promise<StoredImage[]> {
    const all = await this.db.getAll<StoredImage>('images')
    return all.filter((image) => image.documentId === documentId)
  }

  async deleteImagesByDocument(documentId: string): Promise<void> {
    const images = await this.listImagesByDocument(documentId)
    await Promise.all(images.map((image) => this.deleteImage(image.id)))
  }

  async getMeta(key: string): Promise<string | undefined> {
    const record = await this.db.get<{ key: string; value: string }>('meta', key)
    return record?.value
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.db.put('meta', { key, value })
  }
}

// Membuka IndexedDB asli; mengembalikan null saat tidak tersedia/gagal
// (fallback ke localStorage dilakukan oleh repository provider).
export async function createIndexedDbRepository(): Promise<LKPDRepository | null> {
  try {
    const backend = await IndexedDbBackend.open()
    return new IndexedDbRepository(backend)
  } catch (error) {
    console.warn('IndexedDB tidak tersedia, fallback ke localStorage:', error)
    return null
  }
}
