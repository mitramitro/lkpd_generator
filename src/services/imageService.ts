import type { GalleryImage } from '../models/lkpd'
import { newId } from '../lib/id'
import { isImageReference, imageIdFromReference, makeImageReference } from '../lib/imageStorage'
import { canCompressImages, compressImage, optimizeImageFile } from '../lib/imageResize'
import { getRepository } from './repositoryProvider'

export interface UploadedBlockImage {
  url: string
  width: number
  height: number
  filename: string
}

// Upload gambar untuk block image. Pada mode IndexedDB, blob hasil optimasi
// disimpan di object store images dan block menyimpan referensi "idb:<id>".
// Pada mode fallback localStorage, data URL disimpan langsung di block.
export async function uploadBlockImage(file: File, documentId: string): Promise<UploadedBlockImage> {
  const optimized = await optimizeImageFile(file)
  const repo = await getRepository()
  if (repo.supportsBlobImages) {
    const imageId = newId()
    const now = new Date().toISOString()
    await repo.saveImage({
      id: imageId,
      documentId,
      blob: optimized.blob,
      mimeType: optimized.mimeType,
      filename: file.name,
      width: optimized.width,
      height: optimized.height,
      createdAt: now,
      updatedAt: now,
    })
    return { url: makeImageReference(imageId), width: optimized.width, height: optimized.height, filename: file.name }
  }
  return { url: optimized.dataUrl, width: optimized.width, height: optimized.height, filename: file.name }
}

// Upload beberapa gambar untuk galeri.
export async function uploadGalleryImages(files: File[], documentId: string): Promise<GalleryImage[]> {
  const results: GalleryImage[] = []
  for (const file of files) {
    try {
      const optimized = await optimizeImageFile(file)
      const repo = await getRepository()
      const now = new Date().toISOString()
      if (repo.supportsBlobImages) {
        const imageId = newId()
        await repo.saveImage({
          id: imageId,
          documentId,
          blob: optimized.blob,
          mimeType: optimized.mimeType,
          filename: file.name,
          width: optimized.width,
          height: optimized.height,
          createdAt: now,
          updatedAt: now,
        })
        results.push({ id: newId(), src: makeImageReference(imageId), caption: '', alt: file.name, order: 0 })
      } else {
        results.push({ id: newId(), src: optimized.dataUrl, caption: '', alt: file.name, order: 0 })
      }
    } catch {
      // file yang gagal dibaca/optimasi dilewati
    }
  }
  return results
}

// Menghapus blob gambar dari IndexedDB berdasarkan referensinya. Tidak
// melakukan apa-apa untuk data URL / ref yang tidak dikenal.
export async function deleteImageRef(ref: string | undefined): Promise<void> {
  if (!ref || !isImageReference(ref)) return
  const imageId = imageIdFromReference(ref)
  if (!imageId) return
  const repo = await getRepository()
  await repo.deleteImage(imageId)
}

// Gambar berukuran di bawah ini tidak di-rekompresi (keuntungannya kecil,
// biaya decode-nya tidak sepadan).
const RECOMPRESS_MIN_BYTES = 150 * 1024

// Flag meta agar rekompresi legacy hanya dijalankan sekali dalam umur
// penyimpanan, bukan di setiap boot. Gambar baru (upload/import) sudah melalui
// pipeline kompresi sehingga tidak pernah perlu rekompresi lagi.
export const RECOMPRESS_DONE_KEY = 'storage.imageRecompress.done'

// Rekompresi sekali jalan untuk gambar yang sudah tersimpan (mis. hasil import
// .lkpd sebelum jalur kompresi ditambahkan). Melewatkan blob yang sudah WebP
// (sudah lewat pipeline optimasi) dan yang kecil; hanya menimpa bila hasilnya
// benar-benar lebih kecil sehingga tidak pernah memperbesar penyimpanan.
// Idempoten: pada boot berikutnya tidak ada lagi gambar yang perlu diubah.
// Mengembalikan jumlah gambar yang diperkecil.
export async function recompressStoredImages(): Promise<number> {
  if (!canCompressImages()) return 0
  const repo = await getRepository()
  if (!repo.supportsBlobImages) return 0
  if (await repo.getMeta(RECOMPRESS_DONE_KEY)) return 0

  const images = await repo.listImages()
  let count = 0
  for (const record of images) {
    // Background custom (M5.3.1) TIDAK pernah direkompresi: resolusi & kualitas
    // asli dipertahankan karena dipakai sebagai latar halaman full-bleed.
    if (record.kind === 'background') continue
    if (record.mimeType === 'image/webp') continue
    if (record.blob.size < RECOMPRESS_MIN_BYTES) continue
    try {
      const optimized = await compressImage(record.blob)
      if (optimized.blob.size < record.blob.size) {
        await repo.saveImage({
          ...record,
          blob: optimized.blob,
          mimeType: optimized.mimeType,
          width: optimized.width || record.width,
          height: optimized.height || record.height,
          updatedAt: new Date().toISOString(),
        })
        count += 1
      }
    } catch (error) {
      console.warn('Rekompresi gambar gagal, dilewati:', error)
    }
    // Beri ruang ke event loop antar gambar agar print/preview tetap responsif.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  // Tandai selesai (setelah loop selesai) supaya boot berikutnya tidak memindai
  // ulang seluruh store. Bila dibatalkan di tengah, flag belum tertulis dan
  // boot berikutnya melanjutkan.
  try {
    await repo.setMeta(RECOMPRESS_DONE_KEY, new Date().toISOString())
  } catch (error) {
    console.warn('Tidak dapat menandai rekompresi selesai:', error)
  }
  return count
}
