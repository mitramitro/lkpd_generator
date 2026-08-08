import type { LKPDDocument } from '../models/lkpd'
import { lkpdFilenameForTitle } from '../lib/filename'
import { createZipBlob, type ZipEntry } from '../lib/zip'
import { approximateFileSizeKb, exportDocumentWithImages } from './lkpdFile'
import { getRepository } from './repositoryProvider'

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

function triggerDownload(url: string, filename: string): void {
  const link = globalThis.document.createElement('a')
  link.href = url
  link.download = filename
  globalThis.document.body.appendChild(link)
  link.click()
  globalThis.document.body.removeChild(link)
}

// Isi satu backup project (.lkpd) dengan SEMUA gambar ter-embed. Melempar
// BackupError jika ada gambar yang gagal dimuat (jangan buat backup setengah
// jadi).
export async function backupDocumentContent(document: LKPDDocument): Promise<Blob> {
  const repo = await getRepository()
  const images = await repo.listImagesByDocument(document.id)
  const imageMap = new Map(images.map((image) => [image.id, image.blob]))
  const content = await exportDocumentWithImages(document, async (imageId) => imageMap.get(imageId))
  return new Blob([content], { type: 'application/json;charset=utf-8' })
}

export async function downloadBackup(document: LKPDDocument): Promise<void> {
  const blob = await backupDocumentContent(document)
  const url = URL.createObjectURL(blob)
  try {
    triggerDownload(url, lkpdFilenameForTitle(document.metadata.title))
    console.info(`Backup LKPD "${document.metadata.title}": ${approximateFileSizeKb(await blob.text())} KB`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function backupAllFilename(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `backup-lkpd-${y}-${m}-${d}.zip`
}

// Backup semua project menjadi satu ZIP berisi satu .lkpd per project.
export async function backupAllDocuments(documents: LKPDDocument[]): Promise<Blob> {
  if (documents.length === 0) {
    throw new BackupError('Belum ada LKPD untuk dibackup.')
  }

  const repo = await getRepository()
  const entries: ZipEntry[] = []
  const textEncoder = new TextEncoder()

  for (const document of documents) {
    const images = await repo.listImagesByDocument(document.id)
    const imageMap = new Map(images.map((image) => [image.id, image.blob]))
    const content = await exportDocumentWithImages(document, async (imageId) => imageMap.get(imageId))
    entries.push({
      name: `${lkpdFilenameForTitle(document.metadata.title)}.lkpd`,
      data: textEncoder.encode(content),
    })
  }

  return createZipBlob(entries)
}

export async function downloadBackupAll(documents: LKPDDocument[]): Promise<void> {
  const blob = await backupAllDocuments(documents)
  const url = URL.createObjectURL(blob)
  try {
    triggerDownload(url, backupAllFilename())
  } finally {
    URL.revokeObjectURL(url)
  }
}
