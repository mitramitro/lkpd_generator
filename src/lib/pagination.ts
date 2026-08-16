import type { Block, ImageBlock, ImageGalleryBlock, MaterialBlock, QuestionBlock } from '../models/lkpd'
import type { LKPDTemplate, TemplateContentArea } from '../models/template'
import { resolveGalleryColumns, resolveGalleryPlacement, splitImagesIntoRows, type GalleryRow } from './gallery'
import { imageFlowWidthPercent } from './imagePlacement'
import { contentWidthMmFor, contentAreaOf, usableContentHeightMmFor } from './template'

const HEADER_SPACE_MM = 14
const FOOTER_SPACE_MM = 12
const BLOCK_GAP_MM = 5
// Padding vertikal konten di dalam halaman (3mm atas + 3mm bawah).
export const CONTENT_PAD_MM = 6

function ptToMm(pt: number): number {
  return (pt / 72) * 25.4
}

function lineHeightMm(template: LKPDTemplate, fontSizePt: number): number {
  return ptToMm(fontSizePt) * template.typography.lineHeight
}

function charsPerLine(contentWidthMm: number, fontSizePt: number): number {
  const averageCharMm = ptToMm(fontSizePt) * 0.5
  return Math.max(20, Math.floor(contentWidthMm / averageCharMm))
}

function countLines(text: string, perLine: number): number {
  if (text.length === 0) return 1
  let lines = 0
  for (const segment of text.split('\n')) {
    lines += Math.max(1, Math.ceil(segment.length / perLine))
  }
  return lines
}

export function estimateBlockHeightMm(block: Block, template: LKPDTemplate, contentWidthMm: number): number {
  const { typography } = template
  const bodyLine = lineHeightMm(template, typography.bodyFontSize)

  switch (block.type) {
    case 'heading': {
      const size =
        block.level === 1 ? typography.heading1Size : block.level === 2 ? typography.heading2Size : typography.heading3Size
      return ptToMm(size) * typography.headingLineHeight + 8
    }
    case 'text':
      return countLines(block.text, charsPerLine(contentWidthMm, typography.bodyFontSize)) * bodyLine + BLOCK_GAP_MM
    case 'question': {
      const questionLine = lineHeightMm(template, typography.questionFontSize)
      let height = countLines(block.text, charsPerLine(contentWidthMm, typography.questionFontSize)) * questionLine + 4
      if (block.questionType === 'multiple_choice') {
        height += block.options.length * (bodyLine + 3)
      } else {
        height += block.answerSpace.lines * (bodyLine + 4)
      }
      return height + BLOCK_GAP_MM
    }
    case 'image':
      return 55 + BLOCK_GAP_MM
    case 'material': {
      const titleMm = block.title ? ptToMm(typography.heading2Size) * typography.headingLineHeight + 8 : 0
      return countLines(block.content, charsPerLine(contentWidthMm, typography.bodyFontSize)) * bodyLine + titleMm + BLOCK_GAP_MM
    }
    case 'image_gallery': {
      const columns = resolveGalleryColumns(block, contentWidthMm)
      const rows = splitImagesIntoRows(block.images, columns)
      const galleryWidthMm = (contentWidthMm * imageFlowWidthPercent(block.width)) / 100
      const cellMm = Math.min(galleryWidthMm / columns, 90)
      return rows.length * (cellMm + 6) + BLOCK_GAP_MM
    }
    case 'page_break':
      return 0
  }
}

// Unit render & pagination. Question + gambar/gallery terhubungnya adalah SATU
// unit atomik: nomor soal di gutter, media masuk ke content area question.
export interface QuestionPageUnit {
  type: 'question'
  question: QuestionBlock
  images: ImageBlock[]
  galleries: ImageGalleryBlock[]
}

export interface PlainPageUnit {
  type: 'plain'
  block: Block
}

export type PageUnit = QuestionPageUnit | PlainPageUnit

export function unitKey(unit: PageUnit): string {
  return unit.type === 'question' ? unit.question.id : unit.block.id
}

// Mengelompokkan question dengan image/gallery yang terhubung (questionId) menjadi
// satu unit atomik. Media tetap bersama soal-nya meski order dalam dokumen berbeda.
// Media dengan questionId yang mengarah ke soal yang sudah dihapus (orphan)
// menjadi unit plain biasa agar tetap tampil.
export function groupBlocks(blocks: Block[]): PageUnit[] {
  const questionUnits = new Map<string, QuestionPageUnit>()

  for (const block of blocks) {
    if (block.type === 'question') {
      questionUnits.set(block.id, { type: 'question', question: block, images: [], galleries: [] })
    }
  }

  const units: PageUnit[] = []
  const placedQuestions = new Set<string>()

  for (const block of blocks) {
    if (block.type === 'question') {
      if (!placedQuestions.has(block.id)) {
        units.push(questionUnits.get(block.id) as QuestionPageUnit)
        placedQuestions.add(block.id)
      }
      continue
    }

    if (block.type === 'image' && block.questionId) {
      const unit = questionUnits.get(block.questionId)
      if (unit) {
        unit.images.push(block)
        continue
      }
    }

    if (block.type === 'image_gallery' && block.questionId) {
      const unit = questionUnits.get(block.questionId)
      if (unit) {
        unit.galleries.push(block)
        continue
      }
    }

    units.push({ type: 'plain', block })
  }

  return units
}

// Bagian (slice) yang benar-benar ditempatkan pada halaman.
// Sebuah unit question diperluas sesuai placement media:
//   - tanpa gallery            -> head (teks + gambar + opsi) satu slice atomik
//   - gallery above            -> baris galeri lalu head, satu gugus atomik
//   - gallery below/center     -> q_text, baris galeri, q_answer, satu gugus
//   - gallery left/right       -> head dengan kolom galeri di sisi
// Material dipecah menjadi slice per paragraf agar teks panjang mengalir natural.
// Slice dalam satu unit question berbagi group id (group) sehingga selalu
// ditempatkan bersama ("atomic"): tidak pernah soal terpisah dari media/opsi.
export type PageSlice =
  | {
      type: 'head'
      question: QuestionBlock
      questionId: string
      images: ImageBlock[]
      sideGalleries?: ImageGalleryBlock[]
      group?: string
    }
  | {
      type: 'q_text'
      question: QuestionBlock
      questionId: string
      images: ImageBlock[]
      group?: string
    }
  | {
      type: 'q_answer'
      question: QuestionBlock
      questionId: string
      group?: string
    }
  | {
      type: 'gallery_row'
      gallery: ImageGalleryBlock
      row: GalleryRow
      columns: number
      group?: string
    }
  | {
      type: 'material_para'
      material: MaterialBlock
      paraIndex: number
      text: string
      group?: string
    }
  | {
      type: 'plain'
      block: Block
      group?: string
    }

export function sliceKey(slice: PageSlice): string {
  switch (slice.type) {
    case 'head':
      return `${slice.question.id}:head`
    case 'q_text':
      return `${slice.question.id}:q_text`
    case 'q_answer':
      return `${slice.question.id}:q_answer`
    case 'gallery_row':
      return `${slice.gallery.id}:row:${slice.row.index}`
    case 'material_para':
      return `${slice.material.id}:para:${slice.paraIndex}`
    case 'plain':
      return slice.block.id
  }
}

export function splitMaterialParagraphs(content: string): string[] {
  if (content.trim() === '') return ['']
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

export function expandUnitToSlices(unit: PageUnit, contentWidthMm: number): PageSlice[] {
  if (unit.type === 'plain') {
    if (unit.block.type === 'material') {
      const material: MaterialBlock = unit.block
      const paragraphs = splitMaterialParagraphs(material.content)
      return paragraphs.map((text, index) => ({ type: 'material_para', material, paraIndex: index, text }))
    }
    if (unit.block.type === 'image_gallery') {
      // Galeri lepas (tidak terkait soal): row-atomic, boleh lanjut antar halaman.
      const gallery: ImageGalleryBlock = unit.block
      if (gallery.images.length === 0) return [{ type: 'plain', block: gallery }]
      const columns = resolveGalleryColumns(gallery, contentWidthMm)
      const rows = splitImagesIntoRows(gallery.images, columns)
      return rows.map((row) => ({ type: 'gallery_row', gallery, row, columns }))
    }
    return [{ type: 'plain', block: unit.block }]
  }

  // Unit question: question + gambar/galeri terkait selalu satu gugus atomik.
  const { question, images, galleries } = unit

  if (galleries.length === 0) {
    return [{ type: 'head', question, questionId: question.id, images }]
  }

  const galleryRows = (gallery: ImageGalleryBlock, group?: string): PageSlice[] => {
    const columns = resolveGalleryColumns(gallery, contentWidthMm)
    const rows = splitImagesIntoRows(gallery.images, columns)
    return rows.map((row) => ({ type: 'gallery_row', gallery, row, columns, group }))
  }

  const placement = resolveGalleryPlacement(galleries[0])
  const group = question.id

  if (placement === 'left' || placement === 'right') {
    // Galeri sebagai kolom samping di dalam satu slice head (atomik).
    return [{ type: 'head', question, questionId: question.id, images, sideGalleries: galleries, group }]
  }

  if (placement === 'above') {
    // Galeri di atas soal: baris galeri lalu head (nomor+teks+opsi).
    const rows = galleries.flatMap((gallery) => galleryRows(gallery, group))
    return [...rows, { type: 'head', question, questionId: question.id, images, group }]
  }

  // below / center (default): nomor+teks -> galeri -> opsi/jawaban.
  const rows = galleries.flatMap((gallery) => galleryRows(gallery, group))
  return [
    { type: 'q_text', question, questionId: question.id, images, group },
    ...rows,
    { type: 'q_answer', question, questionId: question.id, group },
  ]
}

export interface BlockHeightLookup {
  get: (id: string) => number | undefined
}

// Estimasi tinggi sebuah slice (fallback sebelum pengukuran DOM tersedia).
export function estimateSliceHeightMm(slice: PageSlice, template: LKPDTemplate, contentWidthMm: number): number {
  switch (slice.type) {
    case 'head': {
      let height = estimateBlockHeightMm(slice.question, template, contentWidthMm)
      for (const image of slice.images) {
        height += estimateBlockHeightMm(image, template, contentWidthMm)
      }
      if (slice.sideGalleries && slice.sideGalleries.length > 0) {
        let side = 0
        for (const gallery of slice.sideGalleries) {
          const rows = splitImagesIntoRows(gallery.images, 1)
          const galleryWidthMm = contentWidthMm * (imageFlowWidthPercent(gallery.width) / 100)
          const cellMm = Math.min(galleryWidthMm, 90)
          side += rows.length * (cellMm + 6)
        }
        height = Math.max(height, side)
      }
      return height
    }
    case 'q_text': {
      const { typography } = template
      const questionLine = lineHeightMm(template, typography.questionFontSize)
      let height = countLines(slice.question.text, charsPerLine(contentWidthMm, typography.questionFontSize)) * questionLine + 4
      for (const image of slice.images) {
        height += estimateBlockHeightMm(image, template, contentWidthMm)
      }
      return height
    }
    case 'q_answer': {
      const { typography } = template
      const bodyLine = lineHeightMm(template, typography.bodyFontSize)
      if (slice.question.questionType === 'multiple_choice') {
        return slice.question.options.length * (bodyLine + 3) + 2
      }
      return slice.question.answerSpace.lines * (bodyLine + 4) + 2
    }
    case 'gallery_row': {
      const galleryWidthMm = (contentWidthMm * imageFlowWidthPercent(slice.gallery.width)) / 100
      const cellMm = Math.min(galleryWidthMm / slice.columns, 90)
      const hasCaption = slice.row.images.some((image) => image.caption)
      return cellMm + (hasCaption ? 8 : 0) + BLOCK_GAP_MM
    }
    case 'material_para': {
      const bodyLine = lineHeightMm(template, template.typography.bodyFontSize)
      const titleMm =
        slice.paraIndex === 0 && slice.material.title
          ? ptToMm(template.typography.heading2Size) * template.typography.headingLineHeight + 6
          : 0
      return countLines(slice.text, charsPerLine(contentWidthMm, template.typography.bodyFontSize)) * bodyLine + titleMm + 3
    }
    case 'plain':
      return estimateBlockHeightMm(slice.block, template, contentWidthMm)
  }
}

// Algoritma pagination umum untuk daftar slice.
// - Slice yang berbagi group id (unit question + media-nya) adalah satu gugus
//   atomik: jika tinggi total gugus tidak muat di halaman berjalan, seluruh
//   gugus pindah ke halaman baru. Soal tidak pernah terpisah dari media/opsi.
// - Gallery lepas (tanpa group) row-atomic: boleh lanjut antar halaman di batas
//   baris utuh.
// - page_break tetap memaksa halaman baru.
function buildPages(
  slices: PageSlice[],
  template: LKPDTemplate,
  usableHeight: number,
  contentWidth: number,
  lookup: (id: string) => number | undefined,
): PageSlice[][] {
  const sliceHeight = (slice: PageSlice): number =>
    lookup(sliceKey(slice)) ?? estimateSliceHeightMm(slice, template, contentWidth)

  // Kelompokkan slice yang berbagi group id menjadi satu gugus atomik.
  const groups: { slices: PageSlice[]; total: number }[] = []
  let index = 0
  while (index < slices.length) {
    const slice = slices[index]
    if (slice.group) {
      const members: PageSlice[] = []
      const groupId = slice.group
      while (index < slices.length && slices[index].group === groupId) {
        members.push(slices[index])
        index++
      }
      const total = members.reduce((sum, member) => sum + sliceHeight(member), 0)
      groups.push({ slices: members, total })
    } else {
      groups.push({ slices: [slice], total: sliceHeight(slice) })
      index++
    }
  }

  const pages: PageSlice[][] = []
  let current: PageSlice[] = []
  let used = 0

  for (const group of groups) {
    const first = group.slices[0]
    if (first.type === 'plain' && first.block.type === 'page_break') {
      if (current.length > 0) {
        pages.push(current)
        current = []
        used = 0
      }
      continue
    }

    if (current.length > 0 && used + group.total > usableHeight) {
      pages.push(current)
      current = []
      used = 0
    }

    current.push(...group.slices)
    used += group.total
  }

  if (current.length > 0) pages.push(current)
  return pages
}

// Pagination berbasis tinggi DOM aktual.
export function paginateSlices(
  slices: PageSlice[],
  template: LKPDTemplate,
  heights: BlockHeightLookup,
  headerMm: number,
  footerMm: number,
  contentPadMm = CONTENT_PAD_MM,
  areaOverride?: TemplateContentArea,
): PageSlice[][] {
  const area = areaOverride ?? contentAreaOf(template)
  const usableHeight = usableContentHeightMmFor(template.pageHeight, area, headerMm, footerMm, contentPadMm)
  const contentWidth = contentWidthMmFor(template.pageWidth, area)
  return buildPages(slices, template, usableHeight, contentWidth, (id) => heights.get(id))
}

// Estimasi halaman (dipakai Dashboard) berbasis estimasi tinggi, tanpa DOM.
// Menggunakan HEADER/FOOTER/CONTENT_PAD yang sama dengan default paginateSlices
// dan lebar dari contentArea sehingga jumlah halaman preview == print == dashboard.
export function paginateBlocks(blocks: Block[], template: LKPDTemplate, areaOverride?: TemplateContentArea): PageSlice[][] {
  const area = areaOverride ?? contentAreaOf(template)
  const usableHeight = usableContentHeightMmFor(template.pageHeight, area, HEADER_SPACE_MM, FOOTER_SPACE_MM, CONTENT_PAD_MM)
  const contentWidth = contentWidthMmFor(template.pageWidth, area)
  const units = groupBlocks(blocks)
  const slices = units.flatMap((unit) => expandUnitToSlices(unit, contentWidth))
  return buildPages(slices, template, usableHeight, contentWidth, () => undefined)
}
