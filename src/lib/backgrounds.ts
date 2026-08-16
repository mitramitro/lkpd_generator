import type { CustomBackgroundMeta, LKPDDocument, PageBackgroundConfig } from '../models/lkpd'
import type { TemplateContentArea } from '../models/template'
import { getTemplateById } from '../templates'
import { contentAreaOf } from './template'

// Safe area default untuk background custom (belum ada editor area manual —
// M5.3.1 memakai nilai tetap yang aman untuk A4).
export const DEFAULT_CUSTOM_CONTENT_AREA: TemplateContentArea = { top: 18, right: 18, bottom: 16, left: 18 }

// Config default dokumen (undefined => template yang menentukan).
export function documentBackgroundConfig(document: LKPDDocument): PageBackgroundConfig | undefined {
  return document.background
}

// Config untuk satu halaman: override halaman -> default dokumen -> template.
export function backgroundConfigForPage(document: LKPDDocument, pageNumber: number): PageBackgroundConfig | undefined {
  const override = document.pageBackgrounds?.[String(pageNumber)]
  if (override) return override
  return document.background
}

// Area konten dari sebuah config (tanpa fallback ke template).
// Config yang tidak valid diabaikan; builtin dengan id template tidak dikenal
// jatuh ke contentArea/margins template tsb (aman, tidak pernah lebih kecil).
export function configContentArea(config: PageBackgroundConfig | undefined): TemplateContentArea | undefined {
  if (!config) return undefined
  if (config.contentArea) return config.contentArea
  if (config.mode === 'builtin' && config.backgroundId) {
    return contentAreaOf(getTemplateById(config.backgroundId))
  }
  if (config.mode === 'custom') return DEFAULT_CUSTOM_CONTENT_AREA
  return undefined
}

export interface ResolvedPageBackground {
  contentArea: TemplateContentArea
  builtinUrl?: string
  customImageId?: string
}

// Hasil akhir untuk render satu halaman: URL/ref blob + safe area padding.
// Mode custom tanpa imageId (mis. blob hilang) -> halaman polos + area default,
// TIDAK crash.
export function resolvePageBackground(
  document: LKPDDocument,
  template: { pageWidth: number; pageHeight: number; margins: TemplateContentArea; backgroundImage?: string; contentArea?: TemplateContentArea },
  pageNumber: number,
): ResolvedPageBackground {
  const config = backgroundConfigForPage(document, pageNumber)

  if (config?.mode === 'custom') {
    const area = configContentArea(config) ?? DEFAULT_CUSTOM_CONTENT_AREA
    if (config.imageId) return { contentArea: area, customImageId: config.imageId }
    return { contentArea: area }
  }

  if (config?.mode === 'builtin' && config.backgroundId) {
    const templateById = getTemplateById(config.backgroundId)
    const area = configContentArea(config) ?? contentAreaOf(templateById)
    if (templateById.backgroundImage) return { contentArea: area, builtinUrl: templateById.backgroundImage }
    return { contentArea: area }
  }

  // Tidak ada config -> template menentukan.
  const area = contentAreaOf(template)
  if (template.backgroundImage) return { contentArea: area, builtinUrl: template.backgroundImage }
  return { contentArea: area }
}

// Area pagination = area TERKETAT (max tiap sisi) di antara template, default
// dokumen, dan semua override halaman. Karena semua halaman dicetak pada area
// yang sama dan konten di halaman mana pun TIDAK boleh tertutup background,
// pagination memakai area terketat agar konten selalu muat.
// Deterministis — tidak ada loop, konten selalu pas di safe area halaman mana pun.
export function paginationContentArea(document: LKPDDocument, template: { contentArea?: TemplateContentArea; margins: TemplateContentArea }): TemplateContentArea {
  const candidates: TemplateContentArea[] = [contentAreaOf(template)]
  const push = (config: PageBackgroundConfig | undefined) => {
    const area = configContentArea(config)
    if (area) candidates.push(area)
  }
  push(document.background)
  for (const key of Object.keys(document.pageBackgrounds ?? {})) {
    push(document.pageBackgrounds?.[key])
  }
  return {
    top: Math.max(...candidates.map((area) => area.top)),
    right: Math.max(...candidates.map((area) => area.right)),
    bottom: Math.max(...candidates.map((area) => area.bottom)),
    left: Math.max(...candidates.map((area) => area.left)),
  }
}

// Normalisasi metadata custom background dari input tak dikenal (import).
export function isValidCustomBackgroundMeta(value: unknown): value is CustomBackgroundMeta {
  const record = value as Record<string, unknown> | null
  return (
    !!record &&
    typeof record === 'object' &&
    typeof record.id === 'string' &&
    typeof record.documentId === 'string' &&
    record.kind === 'background'
  )
}
