import type { GalleryColumnPreset, GalleryGap, GalleryImage, GalleryLayout, ImageGalleryBlock } from '../models/lkpd'
import type { ImagePlacement, ImageWidth } from '../models/lkpd'
import { imageFlowWidthPercent } from './imagePlacement'

export const GALLERY_LAYOUT_OPTIONS: { value: GalleryLayout; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'grid', label: 'Grid' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertikal' },
]

// Posisi galeri relatif terhadap soal (tanpa inline — galeri selalu
// berada di luar aliran teks).
export const GALLERY_PLACEMENT_OPTIONS: { value: ImagePlacement; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'above', label: 'Di atas soal' },
  { value: 'below', label: 'Di bawah soal' },
  { value: 'left', label: 'Di kiri soal' },
  { value: 'right', label: 'Di kanan soal' },
  { value: 'center', label: 'Tengah' },
]

// Backward compatible: auto/undefined default ke "below" (semantic utama LKPD).
export function resolveGalleryPlacement(gallery: ImageGalleryBlock): ImagePlacement {
  if (gallery.placement && gallery.placement !== 'auto') return gallery.placement
  return 'below'
}

export const GALLERY_COLUMN_OPTIONS: { value: GalleryColumnPreset; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 1, label: '1 kolom' },
  { value: 2, label: '2 kolom' },
  { value: 3, label: '3 kolom' },
  { value: 4, label: '4 kolom' },
  { value: 5, label: '5 kolom' },
  { value: 6, label: '6 kolom' },
]

export const GALLERY_GAP_OPTIONS: { value: GalleryGap; label: string }[] = [
  { value: 'small', label: 'Kecil' },
  { value: 'medium', label: 'Sedang' },
  { value: 'large', label: 'Besar' },
]

// Reuse opsi lebar dari ImageBlock (small/medium/large/full).
export const GALLERY_WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: 'small', label: 'Kecil' },
  { value: 'medium', label: 'Sedang' },
  { value: 'large', label: 'Besar' },
  { value: 'full', label: 'Lebar penuh' },
]

// Lebar galeri pada halaman (persen dari lebar konten A4).
export function galleryFlowWidthPercent(width: ImageWidth): number {
  return imageFlowWidthPercent(width)
}

export function galleryGapMm(gap: GalleryGap): number {
  switch (gap) {
    case 'small':
      return 2
    case 'medium':
      return 3
    case 'large':
      return 4.5
  }
}

export interface GalleryRow {
  index: number
  images: GalleryImage[]
}

export function parseGalleryColumns(value: string): GalleryColumnPreset {
  if (value === 'auto') return 'auto'
  const number = Number(value)
  if (number >= 1 && number <= 6) return number as GalleryColumnPreset
  return 3
}

// Memilih jumlah kolom:
// - vertical  -> 1 kolom
// - horizontal -> 1 baris (kolom = jumlah gambar)
// - grid      -> pakai setting kolom (auto -> heuristik)
// - auto      -> heuristik berdasar lebar tersedia dan ukuran gambar
export function resolveGalleryColumns(gallery: ImageGalleryBlock, contentWidthMm: number): number {
  if (gallery.layout === 'vertical') return 1
  if (gallery.layout === 'horizontal') return Math.max(1, gallery.images.length)
  if (gallery.layout === 'grid' && gallery.columns !== 'auto') return gallery.columns

  const galleryWidthMm = (contentWidthMm * galleryFlowWidthPercent(gallery.width)) / 100
  const targetCellMm =
    gallery.width === 'small' ? 45 : gallery.width === 'medium' ? 60 : gallery.width === 'large' ? 75 : 95
  const columns = Math.max(1, Math.floor(galleryWidthMm / targetCellMm))
  return Math.min(6, columns)
}

// Membagi daftar gambar menjadi baris-baris utuh (row-atomic).
export function splitImagesIntoRows(images: GalleryImage[], columns: number): GalleryRow[] {
  const rows: GalleryRow[] = []
  for (let index = 0; index < images.length; index += columns) {
    rows.push({ index: rows.length, images: images.slice(index, index + columns) })
  }
  return rows
}
