import type { CustomBackgroundMeta } from '../models/lkpd'
import type { LKPDRepository } from './repository'
import { newId } from '../lib/id'

// M5.3.1 — upload & validasi background custom.
// Gambar disimpan sebagai Blob di IndexedDB (object store images, kind='background');
// dokumen hanya menyimpan metadata (CustomBackgroundMeta) + referensi imageId.

export const MAX_BACKGROUND_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_BACKGROUND_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class BackgroundUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackgroundUploadError'
  }
}

export type DecodedImageSize = { width: number; height: number }
export type BackgroundDecodeFn = (file: Blob) => Promise<DecodedImageSize>

// Dekode gambar untuk memverifikasi gambar benar-benar valid (bukan sekadar
// ekstensi/MIME) sekaligus mengambil dimensi asli. Injectable agar bisa dites
// di Node (tanpa createImageBitmap / <img>).
export function createBackgroundDecoder(): BackgroundDecodeFn {
  return async (file: Blob): Promise<DecodedImageSize> => {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    }
    // Fallback browser lama: gunakan elemen <img>.
    return new Promise<DecodedImageSize>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: image.naturalWidth, height: image.naturalHeight })
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('decode-failed'))
      }
      image.src = url
    })
  }
}

// Validasi murni (tanpa I/O) — pesan error siap ditampilkan ke user.
export function validateBackgroundFile(file: { type: string; size: number }): string | null {
  if (file.size === 0) return 'File kosong.'
  if (!ALLOWED_BACKGROUND_MIME_TYPES.has(file.type)) return 'File bukan gambar yang valid.'
  if (file.size > MAX_BACKGROUND_FILE_BYTES) return 'Ukuran gambar terlalu besar. Maksimal 10 MB.'
  return null
}

// Menyimpan background custom ke repository (Blob) dan mengembalikan metadata
// untuk disimpan ke dokumen. Melempar BackgroundUploadError dengan pesan user-friendly.
export async function uploadCustomBackground(
  file: File,
  documentId: string,
  repo: LKPDRepository,
  decode: BackgroundDecodeFn = createBackgroundDecoder(),
): Promise<CustomBackgroundMeta> {
  const error = validateBackgroundFile(file)
  if (error) throw new BackgroundUploadError(error)

  let size: DecodedImageSize
  try {
    size = await decode(file)
  } catch {
    throw new BackgroundUploadError('Gambar tidak dapat dibaca.')
  }
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
    throw new BackgroundUploadError('Gambar tidak dapat dibaca.')
  }

  const id = newId()
  const now = new Date().toISOString()
  const meta: CustomBackgroundMeta = {
    id,
    documentId,
    kind: 'background',
    mimeType: file.type,
    filename: file.name,
    width: size.width,
    height: size.height,
    size: file.size,
    createdAt: now,
  }

  await repo.saveImage({
    id,
    documentId,
    blob: file,
    mimeType: file.type,
    filename: file.name,
    width: size.width,
    height: size.height,
    size: file.size,
    kind: 'background',
    createdAt: now,
    updatedAt: now,
  })

  return meta
}
