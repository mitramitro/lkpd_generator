import type { LKPDDocument } from '../models/lkpd'
import { lkpdFilenameForTitle } from '../lib/filename'
import { normalizeImportedDocument } from '../lib/lkpdMigration'
import { blobToDataUrl, imageIdFromReference, isImageReference } from '../lib/imageStorage'
import { validateDocument, LKPD_APP, LKPD_CURRENT_VERSION, LKPD_FORMAT, type LKPDFileEnvelope } from '../lib/lkpdValidation'

// Error import dengan pesan aman untuk user (tanpa stack trace).
export class LkpdImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LkpdImportError'
  }
}

export function createLkpdEnvelope(document: LKPDDocument): LKPDFileEnvelope {
  return { format: LKPD_FORMAT, version: LKPD_CURRENT_VERSION, app: LKPD_APP, document }
}

// Export document menjadi JSON string (.lkpd).
export function exportDocument(document: LKPDDocument): string {
  return JSON.stringify(createLkpdEnvelope(document), null, 2)
}

export function exportDocumentBlob(document: LKPDDocument): Blob {
  return new Blob([exportDocument(document)], { type: 'application/json;charset=utf-8' })
}

export type ImageResolver = (imageId: string) => Promise<Blob | undefined>

async function resolveSourceForExport(source: string, resolveRef: ImageResolver): Promise<string> {
  if (!isImageReference(source)) return source
  const imageId = imageIdFromReference(source)
  const blob = await resolveRef(imageId ?? '')
  if (!blob) throw new Error('Backup gagal: ada gambar yang tidak dapat dimuat.')
  return blobToDataUrl(blob)
}

// Ekspor .lkpd dengan semua gambar ter-embed sebagai data URL. Referensi
// "idb:<id>" di-resolve lewat resolver; file yang dihasilkan tetap kompatibel
// dengan format v1 (portable lintas perangkat).
export async function exportDocumentWithImages(
  document: LKPDDocument,
  resolveRef: ImageResolver,
): Promise<string> {
  const blocks = await Promise.all(
    document.blocks.map(async (block) => {
      if (block.type === 'image') {
        return { ...block, url: await resolveSourceForExport(block.url, resolveRef) }
      }
      if (block.type === 'image_gallery') {
        const images = await Promise.all(
          block.images.map(async (image) => ({ ...image, src: await resolveSourceForExport(image.src, resolveRef) })),
        )
        return { ...block, images }
      }
      return block
    }),
  )

  // M5.3.1 — background custom ikut di-embed (dataUrl sementara; di-strip lagi
  // saat import oleh materializeDataUrls). Background bawaan tidak di-embed
  // karena selalu tersedia di /public.
  const customBackgrounds = document.customBackgrounds
    ? await Promise.all(
        document.customBackgrounds.map(async (meta) => {
          if (meta.dataUrl) return meta
          const blob = await resolveRef(meta.id)
          if (!blob) throw new Error('Backup gagal: ada background yang tidak dapat dimuat.')
          return { ...meta, dataUrl: await blobToDataUrl(blob) }
        }),
      )
    : undefined

  return JSON.stringify(createLkpdEnvelope({ ...document, blocks, ...(customBackgrounds ? { customBackgrounds } : {}) }), null, 2)
}

// Perkiraan ukuran file sebelum download (hanya helper informasi, tanpa
// re-encoding/kompresi).
export function approximateFileSizeKb(content: string): number {
  return Math.max(1, Math.ceil(new TextEncoder().encode(content).byteLength / 1024))
}

// Memicu download file .lkpd (Blob + URL.createObjectURL). Nama file diambil
// dari judul dokumen dan di-sanitize untuk kompatibilitas Windows.
export function downloadLkpdFile(doc: LKPDDocument): void {
  const content = exportDocument(doc)
  const url = URL.createObjectURL(exportDocumentBlob(doc))
  const link = globalThis.document.createElement('a')
  link.href = url
  link.download = lkpdFilenameForTitle(doc.metadata.title)
  globalThis.document.body.appendChild(link)
  link.click()
  globalThis.document.body.removeChild(link)
  URL.revokeObjectURL(url)
  console.info(`Ekspor LKPD: ${approximateFileSizeKb(content)} KB`)
}

export { validateDocument }

// Parse + validasi + normalisasi teks .lkpd menjadi LKPDDocument.
export function importDocumentText(text: string, existingIds: string[]): LKPDDocument {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new LkpdImportError('File LKPD tidak valid.')
  }

  const result = validateDocument(data)
  if (!result.ok) {
    throw new LkpdImportError(result.error)
  }

  return normalizeImportedDocument(result.value.document, existingIds)
}

// Membaca file .lkpd dari File Picker lalu memprosesnya.
export async function importDocument(file: File, existingIds: string[]): Promise<LKPDDocument> {
  let text: string
  try {
    text = await file.text()
  } catch {
    throw new LkpdImportError('File LKPD tidak dapat dibuka.')
  }
  return importDocumentText(text, existingIds)
}
