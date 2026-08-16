import type { LKPDDocument } from '../models/lkpd'
import type { LKPDTemplate, TemplateContentArea, TemplateMargins } from '../models/template'

// Satu-satunya cara mengganti template dokumen. HANYA mengubah templateId
// (dan updatedAt). Semua konten — blocks, question IDs, image IDs, gallery,
// questionId pada image, placement, width, metadata — tidak tersentuh.
export function applyTemplate(document: LKPDDocument, templateId: string, now = new Date().toISOString()): LKPDDocument {
  return { ...document, templateId, updatedAt: now }
}

// Area konten efektif sebuah template. Template dengan backgroundImage memakai
// contentArea sendiri (safe area desain); template lama tanpa background tetap
// memakai margins (perilaku M1–M4 tidak berubah).
export function contentAreaOf(template: Pick<LKPDTemplate, 'contentArea' | 'margins'>): TemplateMargins {
  return template.contentArea ?? template.margins
}

// Versi generic (M5.3.1): menghitung lebar/tinggi konten dari area tertentu
// (mm), bukan dari template. Dipakai oleh pagination & render saat area konten
// ditimpa background halaman (area efektif = area terketat di semua halaman).
export function contentWidthMmFor(pageWidth: number, area: TemplateContentArea): number {
  return pageWidth - area.left - area.right
}

export function usableContentHeightMmFor(
  pageHeight: number,
  area: TemplateContentArea,
  headerMm: number,
  footerMm: number,
  contentPadMm: number,
): number {
  return pageHeight - area.top - area.bottom - headerMm - footerMm - contentPadMm
}

// Lebar konten yang tersedia di dalam safe area (mm). Satu-satunya sumber
// kebenaran lebar — dipakai oleh pagination, measurement DOM, dan render.
export function contentWidthMm(template: LKPDTemplate): number {
  return contentWidthMmFor(template.pageWidth, contentAreaOf(template))
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
  return usableContentHeightMmFor(template.pageHeight, contentAreaOf(template), headerMm, footerMm, contentPadMm)
}
