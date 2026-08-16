// Unit tests Milestone 5.3 (Template System Enhancement) — tanpa framework test.
// Dijalankan lewat scripts/run-tests.mjs (tsc -> CommonJS -> node).
import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Block, ImageBlock, LKPDDocument } from '../src/models/lkpd'
import { applyTemplate } from '../src/lib/template'
import { createEmptyDocument, createEssayQuestion, createMaterialBlock, createMultipleChoiceQuestion } from '../src/lib/factories'
import { normalizeImportedDocument } from '../src/lib/lkpdMigration'
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
