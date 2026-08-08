import type { LKPDDocument } from '../models/lkpd'

// Gambar yang disimpan terpisah dari dokumen (IndexedDB Blob), dirujuk dari
// block via referensi "idb:<imageId>" pada field url/src.
export interface StoredImage {
  id: string
  documentId: string
  blob: Blob
  mimeType: string
  filename: string
  width?: number
  height?: number
  createdAt: string
  updatedAt: string
}

// Repository abstraction agar persistence (localStorage, IndexedDB, dan nanti
// Supabase/Laravel API) bisa ditukar tanpa mengubah store / komponen.
export interface LKPDRepository {
  readonly name: string
  // false saat mode fallback (localStorage) yang tidak bisa menyimpan Blob.
  readonly supportsBlobImages: boolean

  init(): Promise<void>
  list(): Promise<LKPDDocument[]>
  get(id: string): Promise<LKPDDocument | undefined>
  save(document: LKPDDocument): Promise<void>
  remove(id: string): Promise<void>

  saveImage(record: StoredImage): Promise<void>
  getImage(id: string): Promise<StoredImage | undefined>
  deleteImage(id: string): Promise<void>
  listImages(): Promise<StoredImage[]>
  listImagesByDocument(documentId: string): Promise<StoredImage[]>
  deleteImagesByDocument(documentId: string): Promise<void>

  getMeta(key: string): Promise<string | undefined>
  setMeta(key: string, value: string): Promise<void>
}
