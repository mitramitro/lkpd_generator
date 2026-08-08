import type {
  Block,
  GalleryColumnPreset,
  GalleryGap,
  GalleryImage,
  GalleryLayout,
  ImageBlock,
  ImageGalleryBlock,
  ImagePlacement,
  ImageWidth,
  LKPDDocument,
  LKPDMetadata,
} from '../models/lkpd'
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from '../templates'
import { newId } from './id'
import { resolveImagePlacement } from './imagePlacement'
import { isRecord } from './lkpdValidation'

const VALID_PLACEMENTS = new Set<ImagePlacement>(['auto', 'above', 'below', 'left', 'right', 'center', 'inline'])
const VALID_GALLERY_PLACEMENTS = new Set<ImagePlacement>(['auto', 'above', 'below', 'left', 'right', 'center'])
const VALID_WIDTHS = new Set<ImageWidth>(['small', 'medium', 'large', 'full'])
const VALID_GAPS = new Set<GalleryGap>(['small', 'medium', 'large'])
const VALID_LAYOUTS = new Set<GalleryLayout>(['auto', 'grid', 'horizontal', 'vertical'])
const VALID_COLUMNS = new Set<GalleryColumnPreset>(['auto', 1, 2, 3, 4, 5, 6])
const KNOWN_TEMPLATE_IDS = new Set(TEMPLATES.map((template) => template.id))

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function coerceNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizePlacement(value: unknown, valid: Set<ImagePlacement>): ImagePlacement | undefined {
  return valid.has(value as ImagePlacement) ? (value as ImagePlacement) : undefined
}

function normalizeWidth(value: unknown): ImageWidth | undefined {
  return VALID_WIDTHS.has(value as ImageWidth) ? (value as ImageWidth) : undefined
}

// Legacy compatibility (memakai resolver existing): placement 'top'/'bottom'
// atau position 'before'/'after' lama di-map menjadi above/below. Nilai yang
// tidak dikenali -> undefined (default read-time = auto).
function normalizeImagePlacement(raw: Record<string, unknown>): ImagePlacement | undefined {
  if (raw.placement === undefined && raw.position === undefined) return undefined
  const mapped = resolveImagePlacement(raw as unknown as ImageBlock)
  return VALID_PLACEMENTS.has(mapped) ? mapped : undefined
}

function normalizeGalleryImage(raw: unknown, index: number): GalleryImage {
  const record = isRecord(raw) ? raw : {}
  return {
    id: typeof record.id === 'string' && record.id !== '' ? record.id : newId(),
    src: coerceString(record.src),
    caption: coerceString(record.caption),
    alt: coerceString(record.alt),
    order: coerceNumber(record.order) ?? index,
  }
}

// Normalisasi block saat import. Hanya melengkapi/memperbaiki data; tidak
// mengubah data yang sudah valid sehingga round-trip bersifat idempoten.
function normalizeBlocks(rawBlocks: unknown[]): Block[] {
  return rawBlocks.map((raw): Block => {
    const record = isRecord(raw) ? raw : {}
    const id = typeof record.id === 'string' && record.id !== '' ? record.id : newId()

    switch (record.type) {
      case 'heading': {
        const level = record.level === 1 || record.level === 2 || record.level === 3 ? record.level : 2
        return { id, type: 'heading', level, text: coerceString(record.text) }
      }
      case 'text':
        return { id, type: 'text', text: coerceString(record.text) }
      case 'question': {
        const base = {
          id,
          type: 'question' as const,
          number: coerceNumber(record.number) ?? 0,
          text: coerceString(record.text),
        }
        if (record.questionType === 'multiple_choice') {
          const options = Array.isArray(record.options) ? record.options.map((option) => coerceString(option)) : []
          return { ...base, questionType: 'multiple_choice' as const, options }
        }
        const lines = isRecord(record.answerSpace) ? (coerceNumber(record.answerSpace.lines) ?? 5) : 5
        return { ...base, questionType: 'essay' as const, answerSpace: { lines } }
      }
      case 'image': {
        const block: ImageBlock = {
          id,
          type: 'image',
          url: coerceString(record.url),
          alt: coerceString(record.alt),
          caption: coerceString(record.caption),
          source: record.source === 'ai' ? 'ai' : 'upload',
        }
        const placement = normalizeImagePlacement(record)
        if (placement) block.placement = placement
        const width = normalizeWidth(record.width)
        if (width) block.width = width
        if (typeof record.questionId === 'string') block.questionId = record.questionId
        return block
      }
      case 'image_gallery': {
        const block: ImageGalleryBlock = {
          id,
          type: 'image_gallery',
          questionId: coerceString(record.questionId),
          placement: normalizePlacement(record.placement, VALID_GALLERY_PLACEMENTS) ?? 'below',
          layout: VALID_LAYOUTS.has(record.layout as GalleryLayout) ? (record.layout as GalleryLayout) : 'grid',
          columns: VALID_COLUMNS.has(record.columns as GalleryColumnPreset)
            ? (record.columns as GalleryColumnPreset)
            : 3,
          gap: VALID_GAPS.has(record.gap as GalleryGap) ? (record.gap as GalleryGap) : 'medium',
          width: normalizeWidth(record.width) ?? 'medium',
          images: Array.isArray(record.images) ? record.images.map(normalizeGalleryImage) : [],
        }
        return block
      }
      case 'material':
        return { id, type: 'material', title: coerceString(record.title), content: coerceString(record.content) }
      case 'page_break':
        return { id, type: 'page_break' }
      default:
        // Validation sudah menolak tipe tidak dikenal sebelum sampai sini;
        // fallback defensif agar tidak pernah men-render data yang salah.
        return { id, type: 'text', text: '' }
    }
  })
}

// Menghasilkan dokumen baru yang ternormalisasi dari data .lkpd.
// - ID baru dihasilkan hanya jika ID wajib hilang atau bentrok dengan dokumen
//   existing (mencegah overwrite diam-diam). Relationship (questionId, dll)
//   tetap dipertahankan.
// - templateId tidak dikenal -> fallback template default.
// - nilai opsional di-normalize; file asli di disk tidak pernah diubah.
export function normalizeImportedDocument(rawDocument: unknown, existingIds: string[]): LKPDDocument {
  const record = isRecord(rawDocument) ? rawDocument : {}
  const rawMetadata = isRecord(record.metadata) ? record.metadata : {}

  const id =
    typeof record.id === 'string' && record.id !== '' && !existingIds.includes(record.id) ? record.id : newId()

  const now = new Date().toISOString()
  const metadata: LKPDMetadata = {
    title: coerceString(rawMetadata.title),
    subject: coerceString(rawMetadata.subject),
    classLevel: coerceString(rawMetadata.classLevel),
    major: coerceString(rawMetadata.major),
    semester: coerceString(rawMetadata.semester),
    alokasiWaktu: coerceString(rawMetadata.alokasiWaktu),
    schoolName: coerceString(rawMetadata.schoolName),
    teacherName: coerceString(rawMetadata.teacherName),
  }

  const templateId =
    typeof record.templateId === 'string' && KNOWN_TEMPLATE_IDS.has(record.templateId)
      ? record.templateId
      : DEFAULT_TEMPLATE_ID

  return {
    id,
    metadata,
    templateId,
    blocks: Array.isArray(record.blocks) ? normalizeBlocks(record.blocks) : [],
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
  }
}
