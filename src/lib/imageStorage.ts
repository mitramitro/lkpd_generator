import type { LKPDDocument } from '../models/lkpd'
import type { LKPDRepository, StoredImage } from '../services/repository'
import { compressImage } from './imageResize'
import { newId } from './id'

// Referensi gambar di IndexedDB disimpan pada field url/src block sebagai
// "idb:<imageId>". Nilai lain (data URL, URL eksternal) ditangani langsung.
export const IMAGE_REF_PREFIX = 'idb:'

export function makeImageReference(imageId: string): string {
  return `${IMAGE_REF_PREFIX}${imageId}`
}

export function isImageReference(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith(IMAGE_REF_PREFIX)
}

export function imageIdFromReference(ref: string): string | undefined {
  if (!ref.startsWith(IMAGE_REF_PREFIX)) return undefined
  return ref.slice(IMAGE_REF_PREFIX.length)
}

export function isDataUrlSource(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('data:')
}

// Konversi data URL (base64) menjadi Blob. Berfungsi di browser dan Node.
export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex === -1) return new Blob([dataUrl], { type: 'text/plain' })
  const header = dataUrl.slice(5, commaIndex)
  const mimeType = header.split(';')[0] || 'application/octet-stream'
  const payload = dataUrl.slice(commaIndex + 1)
  if (/;base64$/i.test(header)) {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mimeType })
  }
  return new Blob([decodeURIComponent(payload)], { type: mimeType })
}

// Konversi Blob menjadi data URL base64. Berfungsi di browser dan Node.
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const mimeType = blob.type || 'application/octet-stream'
  if (bytes.length === 0) return `data:${mimeType};base64,`
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}

type ImageSavingRepo = Pick<LKPDRepository, 'supportsBlobImages' | 'saveImage'>

// Mengubah data URL lama pada document menjadi referensi Blob di repository.
// Backward compatibility: dokumen lama (.lkpd v1 / localStorage) berisi data
// URL; saat disimpan ulang, data URL dikonversi sekali menjadi Blob.
// Mengembalikan dokumen yang sama (referensi) jika tidak ada perubahan.
//
// Saat repository tidak mendukung Blob (mode fallback localStorage), data URL
// TIDAK dimaterialisasi — dokumen tetap disimpan dengan data URL inline supaya
// mode fallback tetap bisa menyimpan dokumen berisi gambar.
export async function materializeDataUrls(document: LKPDDocument, repo: ImageSavingRepo): Promise<LKPDDocument> {
  if (!repo.supportsBlobImages) return document

  let changed = false

  const blocks = await Promise.all(
    document.blocks.map(async (block) => {
      if (block.type === 'image') {
        if (!isDataUrlSource(block.url)) return block
        changed = true
        const optimized = await compressImage(dataUrlToBlob(block.url))
        const imageId = newId()
        const now = new Date().toISOString()
        const record: StoredImage = {
          id: imageId,
          documentId: document.id,
          blob: optimized.blob,
          mimeType: optimized.mimeType,
          filename: block.alt || block.id,
          width: optimized.width || undefined,
          height: optimized.height || undefined,
          createdAt: now,
          updatedAt: now,
        }
        await repo.saveImage(record)
        return { ...block, url: makeImageReference(imageId) }
      }

      if (block.type === 'image_gallery') {
        const images = await Promise.all(
          block.images.map(async (image) => {
            if (!isDataUrlSource(image.src)) return image
            changed = true
            const optimized = await compressImage(dataUrlToBlob(image.src))
            const imageId = newId()
            const now = new Date().toISOString()
            const record: StoredImage = {
              id: imageId,
              documentId: document.id,
              blob: optimized.blob,
              mimeType: optimized.mimeType,
              filename: image.alt || image.id,
              width: optimized.width || undefined,
              height: optimized.height || undefined,
              createdAt: now,
              updatedAt: now,
            }
            await repo.saveImage(record)
            return { ...image, src: makeImageReference(imageId) }
          }),
        )
        return { ...block, images }
      }

      return block
    }),
  )

  return changed ? { ...document, blocks } : document
}
