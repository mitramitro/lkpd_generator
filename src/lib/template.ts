import type { LKPDDocument } from '../models/lkpd'

// Satu-satunya cara mengganti template dokumen. HANYA mengubah templateId
// (dan updatedAt). Semua konten — blocks, question IDs, image IDs, gallery,
// questionId pada image, placement, width, metadata — tidak tersentuh.
export function applyTemplate(document: LKPDDocument, templateId: string, now = new Date().toISOString()): LKPDDocument {
  return { ...document, templateId, updatedAt: now }
}
