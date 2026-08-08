// Unit tests Milestone 4 (.lkpd portable file) — tanpa framework test.
// Dijalankan lewat scripts/run-tests.mjs (tsc -> CommonJS -> node).
import { strict as assert } from 'node:assert'
import type { Block, ImageBlock, ImageGalleryBlock, LKPDDocument } from '../src/models/lkpd'
import {
  createEmptyDocument,
  createEssayQuestion,
  createHeadingBlock,
  createMaterialBlock,
  createMultipleChoiceQuestion,
  createPageBreakBlock,
  createTextBlock,
} from '../src/lib/factories'
import { lkpdFilenameForTitle, sanitizeFilename } from '../src/lib/filename'
import { validateDocument } from '../src/lib/lkpdValidation'
import { importDocumentText, LkpdImportError } from '../src/services/lkpdFile'
import { exportDocument } from '../src/services/lkpdFile'

const DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
const DATA_URL_2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'

const tests: { name: string; fn: () => void }[] = []
function test(name: string, fn: () => void): void {
  tests.push({ name, fn })
}

// Canonical serialization: membandingkan objek secara deep, tanpa peduli urutan key.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

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

  const q1: Block = { ...createMultipleChoiceQuestion(), number: 1, text: 'Apa fungsi utama router?', options: ['A', 'B', 'C', 'D'] }
  const q2: Block = { ...createMultipleChoiceQuestion(), number: 2, text: 'Perangkat penghubung dalam LAN adalah …', options: ['Router', 'Switch', 'Modem', 'Printer'] }
  const q3: Block = { ...createEssayQuestion(), number: 3, text: 'Jelaskan perbedaan LAN dan WAN!', answerSpace: { lines: 5 } }
  const q4: Block = { ...createEssayQuestion(), number: 4, text: 'Sebutkan tiga topologi jaringan!', answerSpace: { lines: 4 } }
  const q5: Block = { ...createMultipleChoiceQuestion(), number: 5, text: 'Alat yang menghubungkan komputer ke internet adalah …', options: ['Modem', 'Keyboard', 'Monitor', 'Speaker'] }

  const imageBelow: ImageBlock = {
    id: 'test-img-1',
    type: 'image',
    url: DATA_URL,
    alt: 'router.png',
    caption: 'Gambar router',
    source: 'upload',
    questionId: q1.id,
    placement: 'below',
    width: 'medium',
  }
  const imageRight: ImageBlock = {
    id: 'test-img-2',
    type: 'image',
    url: DATA_URL_2,
    alt: 'topologi.png',
    caption: 'Topologi jaringan',
    source: 'upload',
    questionId: q3.id,
    placement: 'right',
    width: 'medium',
  }
  const gallery: ImageGalleryBlock = {
    id: 'test-gallery-1',
    type: 'image_gallery',
    questionId: q2.id,
    placement: 'below',
    layout: 'grid',
    columns: 3,
    gap: 'medium',
    width: 'medium',
    images: [
      { id: 'g-1', src: DATA_URL, caption: 'Gambar A', alt: 'a', order: 0 },
      { id: 'g-2', src: DATA_URL_2, caption: 'Gambar B', alt: 'b', order: 1 },
    ],
  }

  document.blocks = [
    createHeadingBlock(1, 'Aktivitas 1: Memahami Perangkat Jaringan'),
    createTextBlock('Perhatikan gambar dan materi berikut, lalu jawablah dengan teliti.'),
    createMaterialBlock('Pengantar Jaringan', 'Jaringan komputer adalah dua atau lebih perangkat yang saling terhubung.\n\nProtokol mengatur komunikasi antar perangkat.'),
    q1,
    q2,
    gallery,
    q3,
    imageBelow,
    imageRight,
    q4,
    createPageBreakBlock(),
    q5,
  ]

  return document
}

test('1. export basic document', () => {
  const doc = buildRichDocument()
  const json = exportDocument(doc)
  const parsed = JSON.parse(json) as Record<string, unknown>
  assert.equal(parsed.format, 'lkpd')
  assert.equal(parsed.version, 1)
  assert.equal((parsed.document as LKPDDocument).id, doc.id)
  assert.ok(Array.isArray((parsed.document as LKPDDocument).blocks))
})

test('2. export material', () => {
  const doc = buildRichDocument()
  const parsed = JSON.parse(exportDocument(doc)) as { document: LKPDDocument }
  const material = parsed.document.blocks.find((block) => block.type === 'material')
  assert.ok(material && material.type === 'material')
  assert.equal(material.title, 'Pengantar Jaringan')
  assert.match(material.content, /Protokol/)
})

test('3. export question', () => {
  const doc = buildRichDocument()
  const parsed = JSON.parse(exportDocument(doc)) as { document: LKPDDocument }
  const questions = parsed.document.blocks.filter((block) => block.type === 'question')
  assert.equal(questions.length, 5)
  const mc = questions[0]
  assert.equal(mc.type, 'question')
  assert.equal(mc.questionType, 'multiple_choice')
  assert.equal(mc.options.length, 4)
  const essay = questions[2]
  assert.equal(essay.type, 'question')
  assert.equal(essay.questionType, 'essay')
  assert.equal(essay.answerSpace.lines, 5)
})

test('4. export image data URL', () => {
  const doc = buildRichDocument()
  const parsed = JSON.parse(exportDocument(doc)) as { document: LKPDDocument }
  const image = parsed.document.blocks.find((block) => block.type === 'image') as ImageBlock
  assert.ok(image)
  assert.equal(image.url, DATA_URL)
  assert.match(image.url, /^data:image\//)
})

test('5. export gallery', () => {
  const doc = buildRichDocument()
  const parsed = JSON.parse(exportDocument(doc)) as { document: LKPDDocument }
  const gallery = parsed.document.blocks.find((block) => block.type === 'image_gallery') as ImageGalleryBlock
  assert.ok(gallery)
  assert.equal(gallery.columns, 3)
  assert.equal(gallery.images.length, 2)
  assert.equal(gallery.images[0].caption, 'Gambar A')
  assert.match(gallery.images[0].src, /^data:image\//)
})

test('6. export placement', () => {
  const doc = buildRichDocument()
  const parsed = JSON.parse(exportDocument(doc)) as { document: LKPDDocument }
  const images = parsed.document.blocks.filter((block) => block.type === 'image') as ImageBlock[]
  const below = images.find((image) => image.id === 'test-img-1')
  const right = images.find((image) => image.id === 'test-img-2')
  assert.equal(below?.placement, 'below')
  assert.equal(right?.placement, 'right')
})

test('7. export template', () => {
  const doc = buildRichDocument()
  const parsed = JSON.parse(exportDocument(doc)) as { document: LKPDDocument }
  assert.equal(parsed.document.templateId, 'modern-blue')
})

test('8. parse valid file', () => {
  const doc = buildRichDocument()
  const imported = importDocumentText(exportDocument(doc), [])
  assert.equal(imported.id, doc.id)
  assert.equal(imported.templateId, 'modern-blue')
  assert.equal(imported.metadata.title, 'Dasar Jaringan Komputer')
  assert.equal(imported.blocks.length, doc.blocks.length)
})

test('9. reject invalid format', () => {
  const result = validateDocument({ format: 'json', version: 1, document: { id: 'x', metadata: {}, templateId: 'modern-blue', blocks: [] } })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /tidak valid/)
})

test('10. reject unsupported version', () => {
  const result = validateDocument({ format: 'lkpd', version: 999, document: { id: 'x', metadata: {}, templateId: 'modern-blue', blocks: [] } })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, 'Versi file LKPD ini tidak didukung.')
})

test('11. sanitize filename', () => {
  assert.equal(sanitizeFilename('Dasar Jaringan Komputer'), 'Dasar-Jaringan-Komputer')
  assert.equal(sanitizeFilename('Dasar: Jaringan*/Komputer?'), 'Dasar-Jaringan-Komputer')
  assert.equal(sanitizeFilename(''), 'LKPD')
  assert.equal(lkpdFilenameForTitle('A/B:C'), 'A-B-C.lkpd')
  assert.ok(!/["<>:|?*\\/]/.test(lkpdFilenameForTitle('f:o<o>b/a>r"x?y*z')))
})

test('12. legacy image placement normalization', () => {
  const doc = buildRichDocument()
  doc.blocks = [
    { id: 'legacy-before', type: 'image', url: DATA_URL, alt: '', caption: '', source: 'upload', position: 'before' },
    { id: 'legacy-after', type: 'image', url: DATA_URL, alt: '', caption: '', source: 'upload', placement: 'top' as never },
  ]
  const imported = importDocumentText(exportDocument(doc), [])
  const images = imported.blocks.filter((block) => block.type === 'image') as ImageBlock[]
  assert.equal(images.find((image) => image.id === 'legacy-before')?.placement, 'above')
  assert.equal(images.find((image) => image.id === 'legacy-after')?.placement, 'above')
})

test('13. round-trip document', () => {
  const doc = buildRichDocument()
  const imported = importDocumentText(exportDocument(doc), [])
  assert.equal(canonical(doc), canonical(imported))
})

test('14. duplicate document ID handling', () => {
  const doc = buildRichDocument()
  const imported = importDocumentText(exportDocument(doc), [doc.id])
  assert.notEqual(imported.id, doc.id)
  assert.equal(imported.metadata.title, doc.metadata.title)
  const importedAgain = importDocumentText(exportDocument(doc), [])
  assert.equal(importedAgain.id, doc.id)
})

test('15. corrupt JSON is rejected gracefully', () => {
  assert.throws(() => importDocumentText('{ not valid json !!!', []), (error) => error instanceof LkpdImportError)
})

test('16. unknown block type is rejected', () => {
  const doc = buildRichDocument()
  doc.blocks = [{ id: 'mystery', type: 'mystery_block' } as unknown as Block]
  assert.throws(() => importDocumentText(exportDocument(doc), []), (error) => error instanceof LkpdImportError)
})

test('17. unknown template falls back to default', () => {
  const doc = buildRichDocument()
  doc.templateId = 'not-a-real-template'
  const imported = importDocumentText(exportDocument(doc), [])
  assert.equal(imported.templateId, 'modern-blue')
})

test('18. missing image gallery image ids are regenerated', () => {
  const doc = buildRichDocument()
  const gallery = doc.blocks.find((block) => block.type === 'image_gallery') as ImageGalleryBlock
  gallery.images = [{ id: '', src: DATA_URL, caption: '', alt: '', order: 0 }]
  const imported = importDocumentText(exportDocument(doc), [])
  const importedGallery = imported.blocks.find((block) => block.type === 'image_gallery') as ImageGalleryBlock
  assert.ok(importedGallery.images[0].id)
  assert.notEqual(importedGallery.images[0].id, '')
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
