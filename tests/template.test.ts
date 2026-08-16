// Unit tests Milestone 5.3 (Template System Enhancement) — tanpa framework test.
// Dijalankan lewat scripts/run-tests.mjs (tsc -> CommonJS -> node).
import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Block, ImageBlock, LKPDDocument } from '../src/models/lkpd'
import type { TemplateContentArea } from '../src/models/template'
import { applyTemplate, contentAreaOf, contentWidthMm, usableContentHeightMm } from '../src/lib/template'
import { createEmptyDocument, createEssayQuestion, createMaterialBlock, createMultipleChoiceQuestion } from '../src/lib/factories'
import { normalizeImportedDocument } from '../src/lib/lkpdMigration'
import { paginateBlocks } from '../src/lib/pagination'
import { A4 } from '../src/templates/base'
import { DEFAULT_TEMPLATE_ID, getTemplateById, TEMPLATES } from '../src/templates'

const tests: { name: string; fn: () => void }[] = []
function test(name: string, fn: () => void): void {
  tests.push({ name, fn })
}

const EXISTING_IDS = ['modern-blue', 'industrial', 'minimal', 'academic'] as const
const BACKGROUND_IDS = ['bg-1', 'bg-2', 'bg-3', 'bg-4'] as const

function buildRichDocument(): LKPDDocument {
  const document = createEmptyDocument(
    {
      title: 'Dasar Jaringan Komputer',
      subject: 'Informatika',
      classLevel: 'X',
      major: 'Teknik Komputer dan Jaringan',
      semester: 'Ganjil',
      alokasiWaktu: '4 JP',
      schoolName: 'SMK Negeri 1 Teknologi',
      teacherName: 'Budi Santoso',
    },
    'modern-blue',
  )

  document.blocks = [
    createMaterialBlock('Pendahuluan', 'Jaringan komputer adalah ...'),
    createMultipleChoiceQuestion(),
    createEssayQuestion(),
  ]

  const q1 = document.blocks.find((block) => block.type === 'question')
  assert.ok(q1, 'soal harus ada untuk setup test')

  document.blocks.push({
    id: 'img-q1',
    type: 'image',
    url: 'data:image/jpeg;base64,/9j/4AAQ',
    alt: 'Diagram',
    caption: 'Gambar',
    source: 'upload',
    questionId: q1.id,
    placement: 'below',
  })

  document.blocks.push({
    id: 'gal-q1',
    type: 'image_gallery',
    questionId: q1.id,
    placement: 'below',
    layout: 'grid',
    columns: 3,
    gap: 'medium',
    width: 'medium',
    images: [{ id: 'gimg-1', src: 'data:image/jpeg;base64,/9j/4AAQ', caption: '', alt: '', order: 0 }],
  })

  return document
}

test('1. template existing tetap tersedia', () => {
  for (const id of EXISTING_IDS) {
    assert.ok(TEMPLATES.some((template) => template.id === id), `template ${id} harus ada`)
    assert.equal(getTemplateById(id).id, id)
  }
})

test('2. template background baru terdaftar', () => {
  for (const id of BACKGROUND_IDS) {
    assert.ok(TEMPLATES.some((template) => template.id === id), `template ${id} harus terdaftar`)
  }
  assert.equal(TEMPLATES.length, EXISTING_IDS.length + BACKGROUND_IDS.length)
})

test('3. template background punya backgroundImage valid (file ada di public/bg)', () => {
  for (const id of BACKGROUND_IDS) {
    const template = getTemplateById(id)
    assert.ok(template.backgroundImage, `${id} harus punya backgroundImage`)
    assert.ok(template.backgroundImage.startsWith('/bg/'), `${id}: path harus di /bg/`)
    assert.ok(template.contentArea, `${id} harus punya contentArea`)
    const relative = template.backgroundImage.replace(/^\//, '')
    assert.ok(existsSync(path.join(process.cwd(), 'public', relative)), `${id}: file ${template.backgroundImage} ada di public/`)
  }
})

test('4. template existing TANPA backgroundImage (perilaku lama tidak berubah)', () => {
  for (const id of EXISTING_IDS) {
    assert.equal(getTemplateById(id).backgroundImage, undefined)
    assert.equal(getTemplateById(id).contentArea, undefined)
  }
})

test('5. getTemplateById mengenali semua template', () => {
  for (const template of TEMPLATES) {
    assert.equal(getTemplateById(template.id).id, template.id)
  }
})

test('6. unknown template fallback ke default, tidak crash', () => {
  assert.equal(getTemplateById('tidak-ada-template').id, DEFAULT_TEMPLATE_ID)
  assert.equal(DEFAULT_TEMPLATE_ID, 'modern-blue')
})

test('7. switching template HANYA mengubah templateId (+updatedAt)', () => {
  const document = buildRichDocument()
  const snapshotBlocks = JSON.parse(JSON.stringify(document.blocks)) as Block[]
  const snapshotMetadata = JSON.parse(JSON.stringify(document.metadata)) as LKPDDocument['metadata']

  const switched = applyTemplate(document, 'bg-1')

  assert.equal(switched.templateId, 'bg-1')
  assert.equal(switched.id, document.id)
  assert.equal(switched.createdAt, document.createdAt)
  assert.deepEqual(switched.metadata, snapshotMetadata)
  assert.deepEqual(switched.blocks, snapshotBlocks)
})

test('8. switching template tidak mengubah question/block IDs', () => {
  const document = buildRichDocument()
  const idsBefore = document.blocks.map((block) => block.id)
  const questionIdsBefore = document.blocks
    .filter((block) => block.type === 'question')
    .map((block) => block.id)
    .sort()

  const switched = applyTemplate(document, 'bg-2')

  assert.deepEqual(switched.blocks.map((block) => block.id), idsBefore)
  const questionIdsAfter = switched.blocks
    .filter((block) => block.type === 'question')
    .map((block) => block.id)
    .sort()
  assert.deepEqual(questionIdsAfter, questionIdsBefore)
})

test('9. switching template tidak mengubah relasi gambar/gallery -> soal', () => {
  const document = buildRichDocument()
  const imageBefore = document.blocks.find((block) => block.id === 'img-q1') as ImageBlock
  const galleryBefore = document.blocks.find((block) => block.type === 'image_gallery')

  const switched = applyTemplate(document, 'bg-3')
  const imageAfter = switched.blocks.find((block) => block.id === 'img-q1') as ImageBlock
  const galleryAfter = switched.blocks.find((block) => block.type === 'image_gallery')

  assert.equal(imageAfter.questionId, imageBefore.questionId)
  assert.equal(galleryAfter?.questionId, galleryBefore?.questionId)
  assert.deepEqual(galleryAfter, galleryBefore)
  assert.equal(switched.blocks.find((block) => block.type === 'question')?.id, document.blocks.find((block) => block.type === 'question')?.id)
})

test('10. import .lkpd dengan templateId baru tetap dikenali', () => {
  const imported = normalizeImportedDocument({ templateId: 'bg-4', blocks: [] }, [])
  assert.equal(imported.templateId, 'bg-4')
})

test('11. import .lkpd dengan templateId tidak dikenal fallback default', () => {
  const imported = normalizeImportedDocument({ templateId: 'bukan-template', blocks: [] }, [])
  assert.equal(imported.templateId, DEFAULT_TEMPLATE_ID)
})

// ---- M5.3 Polish: contentArea sebagai safe area per background ----

test('12. contentArea per background sesuai safe area desain', () => {
  const expected: Record<string, TemplateContentArea> = {
    'bg-1': { top: 25, right: 25, bottom: 24, left: 25 },
    'bg-2': { top: 19, right: 21, bottom: 18, left: 20 },
    'bg-3': { top: 18, right: 18, bottom: 16, left: 18 },
    'bg-4': { top: 24, right: 24, bottom: 22, left: 24 },
  }
  for (const [id, area] of Object.entries(expected)) {
    assert.deepEqual(getTemplateById(id).contentArea, area, `${id} contentArea`)
  }
})

test('13. contentWidthMm memakai contentArea untuk background dan margins untuk template lama', () => {
  const minimal = getTemplateById('minimal')
  assert.equal(contentWidthMm(minimal), minimal.pageWidth - minimal.margins.left - minimal.margins.right)
  for (const id of BACKGROUND_IDS) {
    const template = getTemplateById(id)
    const area = contentAreaOf(template)
    const width = contentWidthMm(template)
    assert.equal(width, template.pageWidth - area.left - area.right)
    assert.ok(width > 0 && width < template.pageWidth, `${id}: lebar konten ${width}mm di dalam halaman`)
    assert.ok(area.left > 0 && area.right > 0 && area.top > 0 && area.bottom > 0, `${id}: semua sisi positif`)
  }
})

test('14. bg-1 dan bg-4 (berbingkai) inset lebih besar dari margin A4 agar konten di dalam bingkai', () => {
  for (const id of ['bg-1', 'bg-4'] as const) {
    const area = contentAreaOf(getTemplateById(id))
    assert.ok(area.top > A4.margins.top, `${id}: top ${area.top} > ${A4.margins.top}`)
    assert.ok(area.right > A4.margins.right, `${id}: right ${area.right} > ${A4.margins.right}`)
    assert.ok(area.bottom > A4.margins.bottom, `${id}: bottom ${area.bottom} > ${A4.margins.bottom}`)
    assert.ok(area.left > A4.margins.left, `${id}: left ${area.left} > ${A4.margins.left}`)
  }
})

test('15. pagination memakai contentArea sehingga preview == print == dashboard', () => {
  const bg1 = getTemplateById('bg-1')
  const minimal = getTemplateById('minimal')

  assert.equal(
    usableContentHeightMm(bg1, 14, 12, 6),
    297 - bg1.contentArea!.top - bg1.contentArea!.bottom - 14 - 12 - 6,
    'tinggi konten bg-1 dari contentArea',
  )
  assert.ok(contentWidthMm(bg1) < contentWidthMm(minimal), 'bg-1 lebih sempit dari template tanpa background')
  assert.ok(usableContentHeightMm(bg1, 14, 12, 6) < usableContentHeightMm(minimal, 14, 12, 6), 'bg-1 lebih pendek')

  const document = createEmptyDocument(
    {
      title: 'Tes Pagination',
      subject: 'Matematika',
      classLevel: 'X',
      major: '',
      semester: 'Ganjil',
      alokasiWaktu: '2 JP',
      schoolName: 'SMA Negeri 1 Contoh',
      teacherName: 'Guru Matematika',
    },
    'bg-1',
  )
  document.blocks = [
    createMaterialBlock('Materi', 'A'.repeat(120)),
    createMultipleChoiceQuestion(),
    createEssayQuestion(),
  ]
  const pages = paginateBlocks(document.blocks, bg1)
  assert.ok(Array.isArray(pages), 'paginateBlocks mengembalikan array halaman')
  assert.ok(pages.length >= 1, 'minimal satu halaman')
  for (const page of pages) {
    assert.ok(page.length > 0, 'setiap halaman punya slice')
  }
})

let passed = 0
const failures: string[] = []
for (const entry of tests) {
  try {
    entry.fn()
    passed += 1
    console.log(`  ok  ${entry.name}`)
  } catch (error) {
    failures.push(entry.name)
    console.error(`  FAIL ${entry.name}`)
    console.error(`       ${(error as Error).message}`)
  }
}

console.log(`\n${passed}/${tests.length} test passed`)
if (failures.length > 0) {
  console.error(`\nFAILED: ${failures.join(', ')}`)
  process.exitCode = 1
}
