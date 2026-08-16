import type { LKPDDocument } from '../models/lkpd'
import type { LKPDTemplate, TemplateMargins } from '../models/template'

// Satu-satunya cara mengganti template dokumen. HANYA mengubah templateId
// (dan updatedAt). Semua konten — blocks, question IDs, image IDs, gallery,
// questionId pada image, placement, width, metadata — tidak tersentuh.
export function applyTemplate(document: LKPDDocument, templateId: string, now = new Date().toISOString()): LKPDDocument {
  return { ...document, templateId, updatedAt: now }
}

// Area konten efektif sebuah template. Template dengan backgroundImage memakai
// contentArea sendiri (safe area desain); template lama tanpa background tetap
// memakai margins (perilaku M1–M4 tidak berubah).
export function contentAreaOf(template: LKPDTemplate): TemplateMargins {
  return template.contentArea ?? template.margins
}

// Lebar konten yang tersedia di dalam safe area (mm). Satu-satunya sumber
// kebenaran lebar — dipakai oleh pagination, measurement DOM, dan render.
export function contentWidthMm(template: LKPDTemplate): number {
  const area = contentAreaOf(template)
  return template.pageWidth - area.left - area.right
}

// Tinggi konten yang tersedia di dalam safe area setelah dikurangi header,
// footer, dan padding konten (mm). Harus identik antara preview dan print agar
// pagination tidak berbeda.
export function usableContentHeightMm(
  template: LKPDTemplate,
  headerMm: number,
  footerMm: number,
  contentPadMm: number,
): number {
  const area = contentAreaOf(template)
  return template.pageHeight - area.top - area.bottom - headerMm - footerMm - contentPadMm
}
