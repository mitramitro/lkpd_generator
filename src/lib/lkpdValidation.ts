import type { LKPDDocument } from '../models/lkpd'

export const LKPD_FORMAT = 'lkpd'
export const LKPD_APP = 'LKPD Generator'
export const LKPD_CURRENT_VERSION = 1

// Envelope file .lkpd. Hanya data dokumen — tidak ada state UI (zoom, modal,
// selection, cache pagination, dll).
export interface LKPDFileEnvelope {
  format: string
  version: number
  app: string
  document: LKPDDocument
}

export type ValidationResult = { ok: true; value: LKPDFileEnvelope } | { ok: false; error: string }

type BlockValidation = { ok: true } | { ok: false; error: string }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

const BLOCK_TYPES = new Set(['heading', 'text', 'question', 'image', 'image_gallery', 'material', 'page_break'])

// Validasi struktur block: tipe dikenal, id ada, dan field wajib per-tipe ada.
// Nilai yang hilang/opsional akan di-normalize oleh lkpdMigration.
function validateBlock(block: unknown, index: number): BlockValidation {
  if (!isRecord(block)) return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
  if (!isString(block.type) || !BLOCK_TYPES.has(block.type)) {
    return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
  }
  if (!isString(block.id) || block.id === '') {
    return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
  }

  switch (block.type) {
    case 'question':
      if (block.questionType !== 'multiple_choice' && block.questionType !== 'essay') {
        return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
      }
      if (block.questionType === 'multiple_choice' && !Array.isArray(block.options)) {
        return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
      }
      if (block.questionType === 'essay' && !isRecord(block.answerSpace)) {
        return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
      }
      if (!isString(block.text)) return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
      return { ok: true }
    case 'image':
      if (!isString(block.url)) return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
      return { ok: true }
    case 'image_gallery':
      if (!Array.isArray(block.images)) return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
      for (const image of block.images) {
        if (!isRecord(image) || !isString(image.id) || !isString(image.src)) {
          return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
        }
      }
      return { ok: true }
    case 'material':
      if (!isString(block.content)) return { ok: false, error: `File LKPD tidak valid. (block ke-${index + 1})` }
      return { ok: true }
    default:
      return { ok: true }
  }
}

// Validasi envelope + dokumen .lkpd. Pesan error siap ditampilkan ke user
// (tanpa stack trace); detail debugging boleh masuk console.
export function validateDocument(data: unknown): ValidationResult {
  if (!isRecord(data)) return { ok: false, error: 'File LKPD tidak valid.' }
  if (data.format !== LKPD_FORMAT) return { ok: false, error: 'File LKPD tidak valid.' }
  if (typeof data.version !== 'number') return { ok: false, error: 'File LKPD tidak valid.' }
  if (data.version !== LKPD_CURRENT_VERSION) return { ok: false, error: 'Versi file LKPD ini tidak didukung.' }
  if (!isRecord(data.document)) return { ok: false, error: 'File LKPD tidak valid.' }

  const doc = data.document
  if (!isString(doc.id) || doc.id === '') return { ok: false, error: 'File LKPD tidak valid.' }
  if (!isRecord(doc.metadata)) return { ok: false, error: 'File LKPD tidak valid.' }
  if (!isString(doc.templateId)) return { ok: false, error: 'File LKPD tidak valid.' }
  if (!Array.isArray(doc.blocks)) return { ok: false, error: 'File LKPD tidak valid.' }

  for (let index = 0; index < doc.blocks.length; index += 1) {
    const result = validateBlock(doc.blocks[index], index)
    if (!result.ok) return result
  }

  return {
    ok: true,
    value: {
      format: LKPD_FORMAT,
      version: LKPD_CURRENT_VERSION,
      app: isString(data.app) ? data.app : LKPD_APP,
      document: doc as unknown as LKPDDocument,
    },
  }
}
