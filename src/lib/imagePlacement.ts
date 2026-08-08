import type { ImageBlock, ImagePlacement, ImageWidth } from '../models/lkpd'

export interface ImageSize {
  w: number
  h: number
}

export const IMAGE_PLACEMENT_OPTIONS: { value: ImagePlacement; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'above', label: 'Di atas soal' },
  { value: 'below', label: 'Di bawah soal' },
  { value: 'left', label: 'Di kiri soal' },
  { value: 'right', label: 'Di kanan soal' },
  { value: 'center', label: 'Tengah' },
  { value: 'inline', label: 'Inline dengan teks' },
]

export const IMAGE_WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: 'small', label: 'Kecil' },
  { value: 'medium', label: 'Sedang' },
  { value: 'large', label: 'Besar' },
  { value: 'full', label: 'Lebar penuh' },
]

export function resolveImageWidth(block: ImageBlock): ImageWidth {
  return block.width ?? 'medium'
}

// Backward compatible: data lama dengan placement top/bottom (milestone 2)
// atau position before/after (milestone 1) di-map read-time menjadi
// above/below tanpa mengubah data tersimpan. Default placement = auto.
export function resolveImagePlacement(block: ImageBlock): ImagePlacement {
  // TS tidak tahu data lama; runtime boleh berisi 'top'/'bottom' dari localStorage.
  const placement = block.placement as ImagePlacement | 'top' | 'bottom' | undefined
  if (placement === 'top') return 'above'
  if (placement === 'bottom') return 'below'
  if (placement) return placement
  if (block.position === 'before') return 'above'
  if (block.position === 'after') return 'below'
  return 'auto'
}

// Lebar gambar pada layout aliran (top/bottom/center/inline).
export function imageFlowWidthPercent(width: ImageWidth): number {
  switch (width) {
    case 'small':
      return 55
    case 'medium':
      return 75
    case 'large':
      return 90
    case 'full':
      return 100
  }
}

// Lebar kolom gambar pada layout dua kolom (left/right).
export function imageColumnWidthPercent(width: ImageWidth): number {
  switch (width) {
    case 'small':
      return 38
    case 'medium':
      return 50
    case 'large':
      return 65
    case 'full':
      return 100
  }
}

export type ResolvedPlacement = Exclude<ImagePlacement, 'auto'>

// AUTO = deterministik, tanpa AI:
// - gambar lebar/besar (rasio >= 1.4 atau width large) -> above
// - soal dengan ruang jawaban panjang (>= 8 baris) -> above
// - gambar portrait/square kecil -> right
// - tidak bisa ditentukan -> center
// Rekomendasi AI akan dibuat pada milestone AI nanti.
export function resolveAutoPlacement(
  images: ImageBlock[],
  size: ImageSize | null,
  answerLines: number,
): ResolvedPlacement {
  const primary = images[0]
  if (!primary) return 'right'

  const width = resolveImageWidth(primary)
  if (width === 'full') return 'above'
  if (answerLines >= 8) return 'above'

  const ratio = size ? size.w / size.h : null
  const isWide = ratio === null ? width === 'large' : ratio >= 1.4
  const isSmall = width === 'small' || (size !== null && Math.min(size.w, size.h) <= 480)

  if (isWide) return 'above'
  if (width === 'large') return 'below'
  if (isSmall) return 'right'
  return 'center'
}
