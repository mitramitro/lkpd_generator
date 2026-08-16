// Unit tests Milestone 5.3.1 (Per-Page Background & Custom Background Upload).
// Dijalankan lewat scripts/run-tests.mjs (tsc -> CommonJS -> node).
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { LKPDDocument, PageBackgroundConfig } from '../src/models/lkpd'
import {
  backgroundConfigForPage,
  configContentArea,
  DEFAULT_CUSTOM_CONTENT_AREA,
  paginationContentArea,
  resolvePageBackground,
} from '../src/lib/backgrounds'
import { createEmptyDocument, createMaterialBlock, createMultipleChoiceQuestion } from '../src/lib/factories'
import { makeImageReference } from '../src/lib/imageStorage'
import { normalizeImportedDocument } from '../src/lib/lkpdMigration'
import { paginateBlocks } from '../src/lib/pagination'
import { contentAreaOf, contentWidthMmFor } from '../src/lib/template'
import { BackgroundUploadError, MAX_BACKGROUND_FILE_BYTES, uploadCustomBackground, validateBackgroundFile } from '../src/services/backgroundService'
import { MemoryDbBackend } from '../src/services/dbBackend'
import { IndexedDbRepository } from '../src/services/indexedDbRepository'
import { exportDocumentWithImages, importDocumentText } from '../src/services/lkpdFile'
import { materializeDataUrls } from '../src/lib/imageStorage'
import { getTemplateById, TEMPLATES } from '../src/templates'
import { useDocumentStore } from '../src/store/documentStore'

const tests: { name: string; fn: () => void | Promise<void> }[] = []
function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn })
}

const METADATA = {
  title: 'LKPD Background',
  subject: 'Informatika',
  classLevel: 'X',
  major: 'Teknik Komputer dan Jaringan',
  semester: 'Ganjil',
  alokasiWaktu: '4 JP',
  schoolName: 'SMK Negeri 1 Teknologi',
  teacherName: 'Budi Santoso',
}

function makeRepo(): IndexedDbRepository {
  return new IndexedDbRepository(new MemoryDbBackend())
}

function buildDocument(templateId = 'bg-1'): LKPDDocument {
  const document = createEmptyDocument(METADATA, templateId)
  document.blocks = [
    createMaterialBlock('Pendahuluan', 'Jaringan komputer adalah dua atau lebih perangkat yang saling terhubung.'),
    createMultipleChoiceQuestion(),
    createMaterialBlock('Penutup', 'Demikian materi singkat tentang jaringan komputer.'),
  ]
  return document
}

function asFile(partial: { name?: string; type?: string; size?: number }): File {
  return {
    name: partial.name ?? 'background.jpg',
    type: partial.type ?? 'image/jpeg',
    size: partial.size ?? 1024,
  } as File
}

async function runAll(): Promise<void> {
  // ---- A. Model & template existing ----

  test('1. template existing tetap bekerja (tanpa background fields tidak berubah)', () => {
    for (const template of TEMPLATES) {
      assert.equal(getTemplateById(template.id).id, template.id)
      if (template.backgroundImage) {
        assert.ok(template.contentArea, `${template.id} harus punya contentArea`)
      }
    }
  })

  test('2. dokumen lama tanpa background fields tetap valid & tidak mendapat field baru', () => {
    const raw = {
      id: 'doc-lama',
      metadata: METADATA,
      templateId: 'bg-1',
      blocks: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const normalized = normalizeImportedDocument(raw, [])
    assert.equal(normalized.background, undefined)
    assert.equal(normalized.pageBackgrounds, undefined)
    assert.equal(normalized.customBackgrounds, undefined)
    assert.ok(resolvePageBackground(normalized, getTemplateById('bg-1'), 1).builtinUrl, 'template menentukan background')
  })

  // ---- C. Default background dokumen ----

  test('3. default background dipakai oleh semua halaman', () => {
    const document = buildDocument('bg-1')
    document.background = { mode: 'builtin', backgroundId: 'bg-2' }
    for (let page = 1; page <= 5; page += 1) {
      const resolved = resolvePageBackground(document, getTemplateById('bg-1'), page)
      assert.equal(resolved.builtinUrl, getTemplateById('bg-2').backgroundImage, `halaman ${page}`)
    }
    assert.deepEqual(backgroundConfigForPage(document, 3), { mode: 'builtin', backgroundId: 'bg-2' })
  })

  // ---- D. Override per halaman ----

  test('4. override halaman mengalahkan default, halaman lain tetap default', () => {
    const document = buildDocument('bg-1')
    document.background = { mode: 'builtin', backgroundId: 'bg-2' }
    document.pageBackgrounds = { '2': { mode: 'builtin', backgroundId: 'bg-3' } }

    const page1 = resolvePageBackground(document, getTemplateById('bg-1'), 1)
    const page2 = resolvePageBackground(document, getTemplateById('bg-1'), 2)
    const page3 = resolvePageBackground(document, getTemplateById('bg-1'), 3)

    assert.equal(page1.builtinUrl, getTemplateById('bg-2').backgroundImage)
    assert.equal(page2.builtinUrl, getTemplateById('bg-3').backgroundImage, 'halaman 2 pakai override')
    assert.equal(page3.builtinUrl, getTemplateById('bg-2').backgroundImage, 'halaman 3 kembali ke default')
  })

  test('5. mode custom dengan imageId mengembalikan referensi blob + safe area default', () => {
    const document = buildDocument('bg-1')
    const config: PageBackgroundConfig = { mode: 'custom', imageId: 'bg-custom-1' }
    document.pageBackgrounds = { '1': config }
    const resolved = resolvePageBackground(document, getTemplateById('bg-1'), 1)
    assert.equal(resolved.customImageId, 'bg-custom-1')
    assert.equal(resolved.builtinUrl, undefined)
    assert.deepEqual(resolved.contentArea, DEFAULT_CUSTOM_CONTENT_AREA)
    assert.deepEqual(configContentArea(config), DEFAULT_CUSTOM_CONTENT_AREA)
  })

  // ---- O. Missing background / blob hilang ----

  test('6. background custom yang blobnya hilang TIDAK crash (fallback default)', () => {
    const document = buildDocument('bg-1')
    document.pageBackgrounds = { '1': { mode: 'custom', imageId: 'tidak-ada-di-indexeddb' } }
    const resolved = resolvePageBackground(document, getTemplateById('bg-1'), 1)
    assert.equal(resolved.customImageId, 'tidak-ada-di-indexeddb')
    assert.equal(resolved.builtinUrl, undefined)
    assert.deepEqual(resolved.contentArea, DEFAULT_CUSTOM_CONTENT_AREA)
  })

  // ---- G. Upload ke IndexedDB ----

  test('7. uploadCustomBackground menyimpan blob (kind=background) dan mengembalikan metadata', async () => {
    const repo = makeRepo()
    const document = buildDocument()
    const decode = async (): Promise<{ width: number; height: number }> => ({ width: 1200, height: 1600 })
    const meta = await uploadCustomBackground(asFile({}), document.id, repo, decode)

    assert.equal(meta.kind, 'background')
    assert.equal(meta.documentId, document.id)
    assert.equal(meta.filename, 'background.jpg')
    assert.equal(meta.width, 1200)
    assert.equal(meta.height, 1600)
    assert.equal(meta.dataUrl, undefined, 'metadata di dokumen TIDAK memuat blob/base64')

    const stored = await repo.getImage(meta.id)
    assert.ok(stored, 'blob tersimpan di IndexedDB')
    assert.equal(stored.kind, 'background')
    assert.equal(stored.documentId, document.id)
    assert.equal(stored.width, 1200)
    assert.equal(stored.height, 1600)
    assert.ok(stored.blob.size > 0)
  })

  test('8. background custom dipakai ulang di banyak halaman (referensi imageId yang sama)', async () => {
    const document = buildDocument('bg-1')
    const imageId = 'custom-sama-untuk-semua'
    document.customBackgrounds = [
      { id: imageId, documentId: document.id, kind: 'background', mimeType: 'image/jpeg', filename: 'x.jpg', width: 800, height: 1200, size: 1000, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    document.background = { mode: 'custom', imageId }
    document.pageBackgrounds = { '3': { mode: 'custom', imageId } }
    for (const page of [1, 2, 4]) {
      assert.equal(resolvePageBackground(document, getTemplateById('bg-1'), page).customImageId, imageId)
    }
    assert.equal(resolvePageBackground(document, getTemplateById('bg-1'), 3).customImageId, imageId)
    assert.ok(document.pageBackgrounds, 'override halaman 3 ada')
  })

  test('9. dokumen yang disimpan TIDAK memuat base64 background (hanya metadata)', () => {
    const document = buildDocument()
    document.background = { mode: 'custom', imageId: 'idb-ok' }
    document.customBackgrounds = [
      { id: 'idb-ok', documentId: document.id, kind: 'background', mimeType: 'image/webp', filename: 'y.webp', width: 900, height: 1300, size: 2048, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    const serialized = JSON.stringify(document)
    assert.ok(!serialized.includes('base64'), 'tidak ada base64 di JSON dokumen')
    assert.ok(!serialized.includes('data:image'), 'tidak ada data URL di JSON dokumen')
    assert.ok(serialized.includes('"kind":"background"'), 'metadata background ada')
  })

  // ---- I. Validasi upload ----

  test('10. file non-gambar ditolak dengan pesan user-friendly', async () => {
    const repo = makeRepo()
    assert.equal(validateBackgroundFile(asFile({ type: 'text/plain' })), 'File bukan gambar yang valid.')
    await assert.rejects(
      () => uploadCustomBackground(asFile({ type: 'text/plain' }), 'doc-1', repo, async () => ({ width: 1, height: 1 })),
      (error) => error instanceof BackgroundUploadError && error.message === 'File bukan gambar yang valid.',
    )
  })

  test('11. file > 10 MB ditolak', async () => {
    const repo = makeRepo()
    assert.equal(
      validateBackgroundFile(asFile({ size: MAX_BACKGROUND_FILE_BYTES + 1 })),
      'Ukuran gambar terlalu besar. Maksimal 10 MB.',
    )
    await assert.rejects(
      () => uploadCustomBackground(asFile({ size: MAX_BACKGROUND_FILE_BYTES + 1 }), 'doc-1', repo, async () => ({ width: 1, height: 1 })),
      (error) => error instanceof BackgroundUploadError,
    )
  })

  test('12. gambar yang tidak bisa didecode ditolak (tidak disimpan)', async () => {
    const repo = makeRepo()
    await assert.rejects(
      () =>
        uploadCustomBackground(asFile({}), 'doc-1', repo, async () => {
          throw new Error('decode-failed')
        }),
      (error) => error instanceof BackgroundUploadError && error.message === 'Gambar tidak dapat dibaca.',
    )
    assert.equal((await repo.listImagesByDocument('doc-1')).length, 0, 'blob tidak boleh tersimpan saat gagal')
  })

  test('12b. dimensi tidak valid (0/negatif) ditolak', async () => {
    const repo = makeRepo()
    await assert.rejects(
      () => uploadCustomBackground(asFile({}), 'doc-1', repo, async () => ({ width: 0, height: 0 })),
      (error) => error instanceof BackgroundUploadError,
    )
  })

  // ---- Q. Pagination ----

  test('13. background tidak mengubah pagination (area konten identik -> halaman sama)', () => {
    const template = getTemplateById('bg-1')
    const without = buildDocument('bg-1')
    const withBg = buildDocument('bg-1')
    withBg.background = { mode: 'custom', imageId: 'custom-x' }
    withBg.pageBackgrounds = { '2': { mode: 'builtin', backgroundId: 'bg-2' } }

    const areaWithout = paginationContentArea(without, template)
    const areaWith = paginationContentArea(withBg, template)
    assert.deepEqual(areaWith, areaWithout, 'area pagination identik (template lebih ketat)')
    assert.equal(
      paginateBlocks(without.blocks, template, areaWithout).length,
      paginateBlocks(withBg.blocks, template, areaWith).length,
      'jumlah halaman tidak berubah oleh background',
    )
  })

  test('14. paginationContentArea = area terketat (max tiap sisi) antar template & background', () => {
    const template = getTemplateById('bg-1') // {25,25,24,25}
    const document = buildDocument('bg-1')
    document.background = { mode: 'builtin', backgroundId: 'bg-3' } // {18,18,16,18}
    document.pageBackgrounds = { '1': { mode: 'custom', imageId: 'c1' } } // {18,18,16,18}
    const area = paginationContentArea(document, template)
    assert.equal(area.top, 25)
    assert.equal(area.right, 25)
    assert.equal(area.bottom, 24)
    assert.equal(area.left, 25)
    assert.deepEqual(area, contentAreaOf(template))
  })

  test('15. area efektif menentukan lebar konten yang dipakai pengukuran & render', () => {
    const template = getTemplateById('bg-1')
    const document = buildDocument('bg-1')
    const area = paginationContentArea(document, template)
    const width = contentWidthMmFor(template.pageWidth, area)
    assert.equal(width, template.pageWidth - area.left - area.right)
    assert.ok(width > 0)
  })

  // ---- L. Backup termasuk background custom ----

  test('16. exportDocumentWithImages me-embed background custom sebagai data URL', async () => {
    const repo = makeRepo()
    const document = buildDocument()
    document.background = { mode: 'custom', imageId: 'bg-blob-1' }
    document.pageBackgrounds = { '1': { mode: 'custom', imageId: 'bg-blob-1' } }
    document.customBackgrounds = [
      { id: 'bg-blob-1', documentId: document.id, kind: 'background', mimeType: 'image/jpeg', filename: 'bg.jpg', width: 1000, height: 1400, size: 5000, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    await repo.saveImage({
      id: 'bg-blob-1',
      documentId: document.id,
      blob: new Blob(['fake-bg-bytes'], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg',
      filename: 'bg.jpg',
      width: 1000,
      height: 1400,
      size: 5000,
      kind: 'background',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const exported = await exportDocumentWithImages(document, async (id) => {
      const record = await repo.getImage(id)
      return record?.blob
    })
    const parsed = JSON.parse(exported) as { version: number; document: LKPDDocument }
    assert.equal(parsed.version, 1, 'format v1 tetap')
    const backgrounds = parsed.document.customBackgrounds
    assert.ok(backgrounds && backgrounds.length === 1)
    assert.ok(backgrounds[0].dataUrl?.startsWith('data:image/jpeg;base64,'), 'background ter-embed')
    assert.ok(!JSON.stringify(parsed).includes('idb:bg-blob-1'), 'referensi idb: tidak boleh tersisa')
  })

  test('16b. export menolak membuat backup setengah jadi saat blob background hilang', async () => {
    const document = buildDocument()
    document.customBackgrounds = [
      { id: 'bg-hilang', documentId: document.id, kind: 'background', mimeType: 'image/jpeg', filename: 'x.jpg', width: 1, height: 1, size: 1, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    await assert.rejects(() => exportDocumentWithImages(document, async () => undefined), /tidak dapat dimuat/)
  })

  // ---- M + N. Import mengembalikan background & regenerate ID ----

  test('17. import .lkpd mengembalikan background custom + remap referensi', async () => {
    const repo = makeRepo()
    const document = buildDocument()
    const sourceId = 'bg-sumber'
    document.background = { mode: 'custom', imageId: sourceId }
    document.pageBackgrounds = { '2': { mode: 'custom', imageId: sourceId } }
    document.customBackgrounds = [
      { id: sourceId, documentId: document.id, kind: 'background', mimeType: 'image/jpeg', filename: 'bg.jpg', width: 1200, height: 1600, size: 8000, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    await repo.saveImage({
      id: sourceId,
      documentId: document.id,
      blob: new Blob(['bg-data'], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg',
      filename: 'bg.jpg',
      width: 1200,
      height: 1600,
      size: 8000,
      kind: 'background',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const exported = await exportDocumentWithImages(document, async (id) => {
      const record = await repo.getImage(id)
      return record?.blob
    })
    const imported = importDocumentText(exported, [])

    assert.notEqual(imported.customBackgrounds?.[0].id, sourceId, 'ID background digenerate ulang')
    assert.equal(imported.customBackgrounds?.length, 1)
    const newId = imported.customBackgrounds?.[0].id
    assert.equal(imported.background?.imageId, newId, 'default background di-remap')
    assert.equal(imported.pageBackgrounds?.['2']?.imageId, newId, 'override halaman di-remap')
    assert.ok(imported.customBackgrounds?.[0].dataUrl, 'dataUrl tersedia untuk dimaterialisasi')

    const materialized = await materializeDataUrls(imported, repo)
    assert.equal(materialized.customBackgrounds?.[0].dataUrl, undefined, 'dataUrl di-strip setelah materialisasi')
    const stored = await repo.getImage(newId)
    assert.ok(stored, 'blob tersimpan dengan ID baru')
    assert.equal(stored.kind, 'background')
  })

  test('18. import file yang sama dua kali -> ID background berbeda (bebas konflik)', () => {
    const document = buildDocument()
    document.customBackgrounds = [
      { id: 'bg-sama', documentId: document.id, kind: 'background', mimeType: 'image/jpeg', filename: 'bg.jpg', width: 1, height: 1, size: 1, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    const first = importDocumentText(JSON.stringify({ format: 'lkpd', version: 1, app: 'LKPD Generator', document }), [])
    const second = importDocumentText(JSON.stringify({ format: 'lkpd', version: 1, app: 'LKPD Generator', document }), [])
    assert.notEqual(first.customBackgrounds?.[0].id, second.customBackgrounds?.[0].id, 'ID digenerate ulang tiap import')
  })

  test('18b. background custom tanpa dataUrl di-strip saat materialisasi (fallback, tanpa base64 besar)', async () => {
    const { lkpdRepository } = await import('../src/services/localStorageRepository')
    const document = buildDocument()
    document.customBackgrounds = [
      { id: 'bg-fallback', documentId: document.id, kind: 'background', mimeType: 'image/webp', filename: 'f.webp', width: 10, height: 10, size: 10, createdAt: '2026-01-01T00:00:00.000Z', dataUrl: 'data:image/webp;base64,AAAA' },
    ]
    const materialized = await materializeDataUrls(document, lkpdRepository)
    assert.ok(materialized.customBackgrounds, 'metadata tetap ada')
    assert.equal(materialized.customBackgrounds?.[0].dataUrl, undefined, 'dataUrl di-strip (tidak ada base64 di localStorage)')
  })

  // ---- P. Persistence & store ----

  test('19. referensi custom tetap valid setelah "refresh" (blob masih di repository)', async () => {
    const repo = makeRepo()
    const meta = await uploadCustomBackground(asFile({ name: 'refresh.jpg' }), 'doc-r', repo, async () => ({ width: 900, height: 1300 }))
    const loaded = await repo.getImage(meta.id)
    assert.ok(loaded, 'blob tetap ada di IndexedDB')
    assert.equal(makeImageReference(meta.id), `idb:${meta.id}`)
    assert.equal(meta.id.length > 0, true)
  })

  test('20. store actions memperbarui background dokumen & halaman', async () => {
    const document = buildDocument('bg-1')
    useDocumentStore.setState({ documents: [document] })
    const store = useDocumentStore.getState()

    store.setDocumentBackground(document.id, { mode: 'builtin', backgroundId: 'bg-4' })
    let current = useDocumentStore.getState().documents.find((doc) => doc.id === document.id)
    assert.deepEqual(current?.background, { mode: 'builtin', backgroundId: 'bg-4' })

    store.setPageBackground(document.id, 2, { mode: 'builtin', backgroundId: 'bg-2' })
    current = useDocumentStore.getState().documents.find((doc) => doc.id === document.id)
    assert.deepEqual(current?.pageBackgrounds?.['2'], { mode: 'builtin', backgroundId: 'bg-2' })

    store.setPageBackground(document.id, 2, undefined)
    current = useDocumentStore.getState().documents.find((doc) => doc.id === document.id)
    assert.equal(current?.pageBackgrounds?.['2'], undefined, 'override dihapus -> default')

    const meta = {
      id: 'custom-store-1',
      documentId: document.id,
      kind: 'background' as const,
      mimeType: 'image/jpeg',
      filename: 's.jpg',
      width: 100,
      height: 200,
      size: 300,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    store.addCustomBackground(document.id, meta)
    current = useDocumentStore.getState().documents.find((doc) => doc.id === document.id)
    assert.equal(current?.customBackgrounds?.length, 1)
    assert.equal(current?.customBackgrounds?.[0].id, 'custom-store-1')
    assert.ok((current?.updatedAt ?? '') >= document.updatedAt, 'updatedAt di-touch')

    useDocumentStore.setState({ documents: [] })
  })

  // ---- R. Print ----

  test('21. aturan print background tetap ada di print.css', () => {
    const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'print.css'), 'utf8')
    assert.match(css, /\.a4-bg/, 'selector .a4-bg ada')
    assert.match(css, /print-color-adjust:\s*exact/, 'print-color-adjust exact ada')
    assert.match(css, /@page\s*\{\s*size:\s*A4 portrait/, '@page A4 portrait ada')
  })

  let passed = 0
  const failures: string[] = []
  for (const entry of tests) {
    try {
      await entry.fn()
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
}

void runAll()
