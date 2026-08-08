// Optimasi gambar saat upload: resize gambar terlalu besar, gunakan WebP
// bila didukung browser, tanpa memperbesar gambar kecil dan tanpa re-encode
// SVG. Hasil kompresi tidak bisa dijanjikan ukurannya (tergantung gambar);
// tujuannya mengurangi ukuran penyimpanan tanpa merusak hasil cetak A4.
import { blobToDataUrl, dataUrlToBlob } from './imageStorage'

export interface OptimizedImage {
  blob: Blob
  mimeType: string
  width: number
  height: number
  // Dipakai saat mode fallback localStorage (tidak menyimpan Blob).
  dataUrl: string
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca gambar'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onerror = () => reject(new Error('Format gambar tidak didukung'))
    image.onload = () => resolve(image)
    image.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null)
      return
    }
    canvas.toBlob(
      (blob) => {
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

export async function optimizeImageFile(blob: Blob, maxDimension = 1600, quality = 0.85): Promise<OptimizedImage> {
  // SVG dibiarkan apa adanya (jangan re-encode sembarangan).
  if (blob.type === 'image/svg+xml') {
    const dataUrl = await readAsDataUrl(blob)
    return { blob, mimeType: blob.type, width: 0, height: 0, dataUrl }
  }

  const original = await readAsDataUrl(blob)
  const image = await loadImage(original)
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale))
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale))

  // Gambar kecil: tidak diperbesar, simpan asli.
  if (scale >= 1) {
    const outBlob = await dataUrlToBlob(original)
    return {
      blob: outBlob,
      mimeType: blob.type,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dataUrl: original,
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d')
  if (!context) {
    const outBlob = await dataUrlToBlob(original)
    return { blob: outBlob, mimeType: blob.type, width: image.naturalWidth, height: image.naturalHeight, dataUrl: original }
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  // WebP mendukung transparansi (alpha), jadi PNG pun aman dikonversi.
  const webp = await canvasToBlob(canvas, 'image/webp', quality)
  if (webp) {
    const dataUrl = await blobToDataUrl(webp)
    return { blob: webp, mimeType: 'image/webp', width: targetWidth, height: targetHeight, dataUrl }
  }

  // Fallback: format asli (PNG untuk transparansi, JPEG untuk foto).
  const mimeType = blob.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const fallback = await canvasToBlob(canvas, mimeType, quality)
  if (fallback) {
    const dataUrl = await blobToDataUrl(fallback)
    return { blob: fallback, mimeType, width: targetWidth, height: targetHeight, dataUrl }
  }

  const outBlob = await dataUrlToBlob(original)
  return { blob: outBlob, mimeType: blob.type, width: image.naturalWidth, height: image.naturalHeight, dataUrl: original }
}

// True bila API browser untuk kompresi tersedia (FileReader + Image + canvas).
// Di lingkungan tanpa browser (test Node) selalu false -> tanpa kompresi.
export function canCompressImages(): boolean {
  return (
    typeof globalThis.FileReader !== 'undefined' &&
    typeof globalThis.Image !== 'undefined' &&
    typeof globalThis.HTMLCanvasElement !== 'undefined'
  )
}

// Kompresi yang AMAN untuk jalur materialisasi/import: hasil optimasi blob
// (WebP, max 1600px), tapi TIDAK pernah menggagalkan pemanggil — error apa pun
// (termasuk lingkungan tanpa browser) dikembalikan sebagai blob asli.
export async function compressImage(
  blob: Blob,
  maxDimension = 1600,
  quality = 0.85,
): Promise<{ blob: Blob; mimeType: string; width: number; height: number }> {
  if (!canCompressImages()) {
    return { blob, mimeType: blob.type, width: 0, height: 0 }
  }
  try {
    const optimized = await optimizeImageFile(blob, maxDimension, quality)
    return { blob: optimized.blob, mimeType: optimized.mimeType, width: optimized.width, height: optimized.height }
  } catch (error) {
    console.warn('Kompresi gambar gagal, gambar asli digunakan:', error)
    return { blob, mimeType: blob.type, width: 0, height: 0 }
  }
}

// Membaca file gambar sebagai data URL. Foto besar di-render ulang ke JPEG
// (PNG dipertahankan agar transparansi tidak berubah). Dipakai untuk bacan
// gambar yang tidak masuk jalur optimasi Blob.
export function fileToDataUrl(file: File, maxDimension = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Gagal membaca "${file.name}"`))
    reader.onload = () => {
      const original = String(reader.result)
      const image = new Image()
      image.onerror = () => reject(new Error(`Format gambar tidak didukung: "${file.name}"`))
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
        if (scale >= 1 || file.type === 'image/png') {
          resolve(original)
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          resolve(original)
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.src = original
    }
    reader.readAsDataURL(file)
  })
}
