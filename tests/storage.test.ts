// Unit tests Milestone 4.5 (local-first storage, image blob, backup).
// Dijalankan lewat scripts/run-tests.mjs (tsc -> CommonJS -> node).
import { strict as assert } from 'node:assert'
import type { ImageBlock, LKPDDocument } from '../src/models/lkpd'
import { createEmptyDocument, createImageBlock } from '../src/lib/factories'
import {
  blobToDataUrl,
  dataUrlToBlob,
  imageIdFromReference,
  isImageReference,
  makeImageReference,
  materializeDataUrls,
} from '../src/lib/imageStorage'
import { migrateLocalStorageToIndexedDb } from '../src/lib/storageMigration'
import { backupAllDocuments, BackupError, backupAllFilename } from '../src/services/backupService'
import { MemoryDbBackend, type DbBackend } from '../src/services/dbBackend'
import { IndexedDbRepository } from '../src/services/indexedDbRepository'
import { exportDocumentWithImages } from '../src/services/lkpdFile'
import { createRepository, indexedDbAvailable, resetRepository } from '../src/services/repositoryProvider'
import type { StoredImage } from '../src/services/repository'
import { useDocumentStore } from '../src/store/documentStore'
import { createZipBytes, type ZipEntry } from '../src/lib/zip'
import { formatBytes, formatDateTime, storageFailureMessage } from '../src/lib/storageInfo'

const DATA_URL_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
const DATA_URL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'

const tests: { name: string; fn: () => void | Promise<void> }[] = []
function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn })
}

const METADATA = {
  title: 'Dasar Jaringan Komputer',
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

function documentWithImageUrl(url: string): LKPDDocument {
  const document = createEmptyDocument(METADATA, 'modern-blue')
  const image: ImageBlock = {
    ...createImageBlock(),
    url,
    alt: 'gambar-jaringan.png',
    source: 'upload',
    questionId: '',
    placement: 'below',
    width: 'medium',
  }
  document.blocks = [image]
  return document
}

// ---- localStorage global palsu (Node tidak menyediakannya tanpa flag) ----
const fakeStore = new Map<string, string>()
const fakeLocalStorage = {
  getItem: (key: string): string | null => fakeStore.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    fakeStore.set(key, value)
  },
  removeItem: (key: string): void => {
    fakeStore.delete(key)
  },
  clear: (): void => {
    fakeStore.clear()
  },
}
;(globalThis as Record<string, unknown>).localStorage = fakeLocalStorage

// ---- ZIP parsing minimal untuk validasi struktur backup ----
function parseZipStructure(bytes: Uint8Array): { count: number; names: string[] } {
  const text = new TextDecoder('latin1').decode(bytes)
  const eocdIndex = text.lastIndexOf('PK\x05\x06')
  assert.ok(eocdIndex >= 0, 'EOCD signature (PK\\x05\\x06) tidak ditemukan')
  const centralSize = bytes[eocdIndex + 12] | (bytes[eocdIndex + 13] << 8) | (bytes[eocdIndex + 14] << 16) | (bytes[eocdIndex + 15] << 24)
  const centralOffset = bytes[eocdIndex + 16] | (bytes[eocdIndex + 17] << 8) | (bytes[eocdIndex + 18] << 16) | (bytes[eocdIndex + 19] << 24)
  const count = bytes[eocdIndex + 10] | (bytes[eocdIndex + 11] << 8)
  assert.equal(centralSize + centralOffset, eocdIndex, 'Central directory harus diikuti EOCD')
  assert.equal(bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24), 0x04034b50, 'Local header pertama harus PK\\x03\\x04')
  const names: string[] = []
  let cursor = centralOffset
  for (let i = 0; i < count; i += 1) {
    assert.equal(bytes[cursor] | (bytes[cursor + 1] << 8) | (bytes[cursor + 2] << 16) | (bytes[cursor + 3] << 24), 0x02014b50, 'Central entry harus PK\\x01\\x02')
    const nameLen = bytes[cursor + 28] | (bytes[cursor + 29] << 8)
    const extraLen = bytes[cursor + 30] | (bytes[cursor + 31] << 8)
    const commentLen = bytes[cursor + 32] | (bytes[cursor + 33] << 8)
    const name = new TextDecoder('utf-8').decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen))
    names.push(name)
    cursor += 46 + nameLen + extraLen + commentLen
  }
  return { count, names }
}

test('1. provider selection falls back to localStorage tanpa IndexedDB', async () => {
  assert.equal(indexedDbAvailable(), false)
  resetRepository()
  const repo = await createRepository()
  assert.equal(repo.name, 'localstorage')
  assert.equal(repo.supportsBlobImages, false)
})

test('2. document CRUD round-trip di IndexedDbRepository', async () => {
  const repo = makeRepo()
  const document = createEmptyDocument(METADATA, 'modern-blue')
  await repo.save(document)
  const listed = await repo.list()
  assert.equal(listed.length, 1)
  assert.equal(listed[0].id, document.id)
  const fetched = await repo.get(document.id)
  assert.equal(fetched?.metadata.title, METADATA.title)
  await repo.remove(document.id)
  assert.equal(await repo.get(document.id), undefined)
  assert.equal((await repo.list()).length, 0)
})

test('2b. inline-key store: put tidak boleh menerima key parameter', async () => {
  // Meniru perilaku Chrome: put dengan key pada object store ber-keyPath
  // melempar DataError. Memastikan repository TIDAK meneruskan key.
  class InlineKeyBackend implements DbBackend {
    readonly putCalls: { store: string; value: unknown }[] = []
    async get<T>(_store: string, _key: string): Promise<T | undefined> {
      return undefined
    }
    async put<T>(store: string, value: T, key?: string): Promise<void> {
      assert.equal(key, undefined, `put(${store}) tidak boleh menerima key (inline keys)`)
      this.putCalls.push({ store, value })
    }
    async delete(_store: string, _key: string): Promise<void> {}
    async getAll<T>(_store: string): Promise<T[]> {
      return []
    }
  }

  const backend = new InlineKeyBackend()
  const repo = new IndexedDbRepository(backend)
  const document = createEmptyDocument(METADATA, 'modern-blue')
  await repo.save(document)
  await repo.saveImage({ id: 'i1', documentId: document.id, blob: new Blob(['x']), mimeType: 'image/png', filename: 'x.png', createdAt: '', updatedAt: '' })
  await repo.setMeta('flag', '1')
  assert.deepEqual(backend.putCalls.map((call) => call.store), ['documents', 'images', 'meta'])
  assert.equal((backend.putCalls[0].value as { id: string }).id, document.id)
  assert.equal((backend.putCalls[2].value as { key: string }).key, 'flag')
})

test('3. image blob disimpan & dimuat kembali utuh', async () => {
  const repo = makeRepo()
  const blob = dataUrlToBlob(DATA_URL_JPEG)
  const record: StoredImage = {
    id: 'img-1',
    documentId: 'doc-1',
    blob,
    mimeType: blob.type,
    filename: 'router.png',
    width: 1200,
    height: 800,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  await repo.saveImage(record)
  const loaded = await repo.getImage('img-1')
  assert.ok(loaded)
  assert.equal(loaded.filename, 'router.png')
  assert.equal(loaded.width, 1200)
  const originalBytes = new Uint8Array(await blob.arrayBuffer())
  const loadedBytes = new Uint8Array(await loaded.blob.arrayBuffer())
  assert.deepEqual(Array.from(loadedBytes), Array.from(originalBytes))
  await repo.deleteImage('img-1')
  assert.equal(await repo.getImage('img-1'), undefined)
})

test('4. deleteImagesByDocument hanya menghapus gambar project itu', async () => {
  const repo = makeRepo()
  const save = async (id: string, documentId: string): Promise<void> => {
    await repo.saveImage({ id, documentId, blob: new Blob(['x'], { type: 'image/png' }), mimeType: 'image/png', filename: `${id}.png`, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' })
  }
  await save('a1', 'doc-a')
  await save('a2', 'doc-a')
  await save('b1', 'doc-b')
  await repo.deleteImagesByDocument('doc-a')
  assert.equal(await repo.getImage('a1'), undefined)
  assert.equal(await repo.getImage('a2'), undefined)
  assert.ok(await repo.getImage('b1'))
  assert.equal((await repo.listImagesByDocument('doc-b')).length, 1)
})

test('5. materializeDataUrls mengubah data URL image block jadi referensi Blob', async () => {
  const repo = makeRepo()
  const document = documentWithImageUrl(DATA_URL_JPEG)
  const materialized = await materializeDataUrls(document, repo)
  assert.notEqual(materialized, document, 'dokumen baru harus dikembalikan saat ada perubahan')
  const image = materialized.blocks[0]
  assert.ok(image.type === 'image')
  assert.ok(isImageReference(image.url), 'url harus menjadi referensi idb:')
  const imageId = imageIdFromReference(image.url)
  assert.ok(imageId)
  const stored = await repo.getImage(imageId)
  assert.ok(stored)
  assert.equal(stored.documentId, document.id)
  assert.equal(stored.mimeType, 'image/jpeg')
})

test('6. materializeDataUrls juga mengubah data URL pada galeri', async () => {
  const repo = makeRepo()
  const document = createEmptyDocument(METADATA, 'modern-blue')
  document.blocks = [
    {
      id: 'gallery-1',
      type: 'image_gallery',
      questionId: 'q1',
      placement: 'below',
      layout: 'grid',
      columns: 3,
      gap: 'medium',
      width: 'medium',
      images: [
        { id: 'g1', src: DATA_URL_JPEG, caption: 'A', alt: 'a', order: 0 },
        { id: 'g2', src: DATA_URL_PNG, caption: 'B', alt: 'b', order: 1 },
        { id: 'g3', src: 'https://example.com/c.svg', caption: 'C', alt: 'c', order: 2 },
      ],
    },
  ]
  const materialized = await materializeDataUrls(document, repo)
  const gallery = materialized.blocks[0]
  assert.ok(gallery.type === 'image_gallery')
  assert.equal(gallery.images.length, 3)
  assert.ok(isImageReference(gallery.images[0].src))
  assert.ok(isImageReference(gallery.images[1].src))
  assert.equal(gallery.images[2].src, 'https://example.com/c.svg', 'sumber non-data-URL tidak diubah')
  const ids: string[] = []
  for (const image of gallery.images) {
    const id = imageIdFromReference(image.src)
    if (id) ids.push(id)
  }
  assert.equal(ids.length, 2)
  for (const id of ids) {
    assert.ok(await repo.getImage(id))
  }
})

test('7. materializeDataUrls idempoten (dokumen tanpa data URL tidak berubah)', async () => {
  const repo = makeRepo()
  const document = createEmptyDocument(METADATA, 'modern-blue')
  document.blocks = [createImageBlock()]
  const result = await materializeDataUrls(document, repo)
  assert.equal(result, document, 'referensi objek sama saat tidak ada perubahan')
  assert.ok(createImageBlock().url === '' || createImageBlock().url !== undefined)
  assert.equal((await repo.listImagesByDocument(document.id)).length, 0)
})

test('8. referensi image helper', () => {
  assert.equal(makeImageReference('abc-123'), 'idb:abc-123')
  assert.equal(imageIdFromReference('idb:abc-123'), 'abc-123')
  assert.equal(imageIdFromReference('data:image/png;base64,x'), undefined)
  assert.equal(isImageReference('idb:x'), true)
  assert.equal(isImageReference(undefined), false)
  assert.equal(isImageReference('https://x/y.png'), false)
})

test('9. localStorage repository adalah fallback tanpa Blob', async () => {
  const repo = makeRepo()
  assert.equal(repo.supportsBlobImages, true)
  const { lkpdRepository } = await import('../src/services/localStorageRepository')
  assert.equal(lkpdRepository.supportsBlobImages, false)
  await assert.rejects(() => lkpdRepository.saveImage({ id: 'x', documentId: 'd', blob: new Blob(['x']), mimeType: 'image/png', filename: 'x.png', createdAt: '', updatedAt: '' }))
  assert.equal(await lkpdRepository.getImage('x'), undefined)
})

test('9b. mode fallback tetap bisa menyimpan dokumen bergambar (materialize no-op)', async () => {
  const { lkpdRepository } = await import('../src/services/localStorageRepository')
  const document = documentWithImageUrl(DATA_URL_PNG)
  const result = await materializeDataUrls(document, lkpdRepository)
  assert.equal(result, document, 'tanpa dukungan Blob, data URL harus tetap inline (referensi sama)')
  const image = result.blocks[0]
  assert.ok(image.type === 'image' && !isImageReference(image.url), 'url tidak boleh berubah menjadi idb:')
})

test('9c. compressImage aman di lingkungan tanpa browser (fallback ke blob asli)', async () => {
  const { compressImage } = await import('../src/lib/imageResize')
  const blob = dataUrlToBlob(DATA_URL_JPEG)
  const result = await compressImage(blob)
  assert.equal(result.blob, blob, 'harus mengembalikan blob yang sama tanpa browser')
  assert.equal(result.mimeType, 'image/jpeg')
  assert.equal(result.width, 0)
  assert.equal(result.height, 0)
})

test('9d. listImages mengembalikan semua gambar tersimpan', async () => {
  const repo = makeRepo()
  await repo.saveImage({ id: 'a', documentId: 'doc-1', blob: new Blob(['x']), mimeType: 'image/png', filename: 'a.png', createdAt: '', updatedAt: '' })
  await repo.saveImage({ id: 'b', documentId: 'doc-2', blob: new Blob(['y']), mimeType: 'image/jpeg', filename: 'b.jpg', createdAt: '', updatedAt: '' })
  const all = await repo.listImages()
  assert.deepEqual(all.map((image) => image.id).sort(), ['a', 'b'])
  const { lkpdRepository } = await import('../src/services/localStorageRepository')
  assert.deepEqual(await lkpdRepository.listImages(), [])
})

test('9e. recompressStoredImages no-op tanpa browser / tanpa blob', async () => {
  resetRepository()
  const { recompressStoredImages } = await import('../src/services/imageService')
  const count = await recompressStoredImages()
  assert.equal(count, 0, 'tanpa browser tidak ada gambar yang bisa dikompres')
})

test('10. migrasi localStorage -> IndexedDB sekali jalan', async () => {
  const repo = makeRepo()
  const document = documentWithImageUrl(DATA_URL_PNG)
  fakeLocalStorage.setItem('lkpd-builder.documents.v1', JSON.stringify([document]))

  await migrateLocalStorageToIndexedDb(repo)
  const migrated = await repo.get(document.id)
  assert.ok(migrated)
  const image = migrated.blocks[0]
  assert.ok(image.type === 'image' && isImageReference(image.url))
  assert.equal((await repo.list()).length, 1)

  const flag = await repo.getMeta('storage.migration.localstorage.indexeddb')
  assert.ok(flag, 'flag migrasi harus tertulis')

  await migrateLocalStorageToIndexedDb(repo)
  assert.equal((await repo.list()).length, 1, 'migrasi tidak boleh duplikat (flag)')
})

test('11. exportDocumentWithImages me-embed gambar ref jadi data URL', async () => {
  const repo = makeRepo()
  const document = documentWithImageUrl(DATA_URL_JPEG)
  const materialized = await materializeDataUrls(document, repo)
  const stored = await repo.getImage(imageIdFromReference((materialized.blocks[0] as ImageBlock).url) as string)

  const exported = await exportDocumentWithImages(materialized, async (imageId) => {
    const record = await repo.getImage(imageId)
    return record?.blob
  })
  const parsed = JSON.parse(exported) as { document: LKPDDocument }
  const exportedImage = parsed.document.blocks[0] as ImageBlock
  assert.ok(exportedImage.url.startsWith('data:image/'))
  const expected = stored ? await blobToDataUrl(stored.blob) : ''
  assert.equal(exportedImage.url, expected)
})

test('12. exportDocumentWithImages menolak membuat backup setengah jadi', async () => {
  const repo = makeRepo()
  const document = documentWithImageUrl(DATA_URL_JPEG)
  const materialized = await materializeDataUrls(document, repo)
  await repo.deleteImage(imageIdFromReference((materialized.blocks[0] as ImageBlock).url) as string)
  await assert.rejects(
    () => exportDocumentWithImages(materialized, async () => undefined),
    /tidak dapat dimuat/,
  )
})

test('13. backup semua: error saat kosong + nama file ZIP', async () => {
  await assert.rejects(() => backupAllDocuments([]), (error) => error instanceof BackupError)
  const filename = backupAllFilename()
  assert.match(filename, /^backup-lkpd-\d{4}-\d{2}-\d{2}\.zip$/)
})

test('14. zip writer menghasilkan struktur ZIP yang valid', () => {
  const encoder = new TextEncoder()
  const entries: ZipEntry[] = [
    { name: 'LKPD-Nama-Project.lkpd', data: encoder.encode('{"format":"lkpd"}') },
    { name: 'LKPD-Kedua.lkpd', data: encoder.encode('{"format":"lkpd","x":1}') },
  ]
  const bytes = createZipBytes(entries)
  const { count, names } = parseZipStructure(bytes)
  assert.equal(count, 2)
  assert.deepEqual(names, ['LKPD-Nama-Project.lkpd', 'LKPD-Kedua.lkpd'])
})

test('15. store markBackedUp mencatat lastBackupAt', async () => {
  resetRepository()
  const document = createEmptyDocument(METADATA, 'modern-blue')
  useDocumentStore.setState({ documents: [document] })
  await useDocumentStore.getState().markBackedUp(document.id, '2026-08-08T10:30:00.000Z')
  const updated = useDocumentStore.getState().documents.find((item) => item.id === document.id)
  assert.equal(updated?.lastBackupAt, '2026-08-08T10:30:00.000Z')
  const repo = await createRepository()
  const persisted = await repo.get(document.id)
  assert.equal(persisted?.lastBackupAt, '2026-08-08T10:30:00.000Z')
  useDocumentStore.setState({ documents: [] })
})

let passed = 0
const failures: string[] = []

async function runAll(): Promise<void> {
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

  // helper storageInfo dicek langsung (di luar tabel agar tetap tercakup di atas)
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(2048), '2 KB')
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB')
  assert.equal(formatDateTime(undefined), 'Belum pernah dibackup')
  assert.match(storageFailureMessage(), /backup \.LKPD/)
  console.log('  ok  storageInfo helpers (formatBytes/formatDateTime/storageFailureMessage)')

  console.log(`\n${passed}/${tests.length} test passed`)
  if (failures.length > 0) {
    console.error(`\nFAILED: ${failures.join(', ')}`)
    process.exitCode = 1
  }
}

void runAll()
