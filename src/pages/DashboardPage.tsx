import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ArchiveIcon, ArrowLeftIcon, DownloadIcon, FileTextIcon, PlusIcon, TrashIcon } from '../components/ui/icons'
import { formatDate } from '../lib/format'
import { paginateBlocks } from '../lib/pagination'
import { createSampleDocument } from '../lib/seed'
import { formatBytes, getStorageEstimate, STORAGE_LIMIT_COPY, type StorageEstimate } from '../lib/storageInfo'
import { BackupError, downloadBackupAll } from '../services/backupService'
import { importDocument, LkpdImportError } from '../services/lkpdFile'
import { useDocumentStore } from '../store/documentStore'
import { getTemplateById } from '../templates'

export function DashboardPage() {
  const navigate = useNavigate()
  const documents = useDocumentStore((state) => state.documents)
  const addDocument = useDocumentStore((state) => state.addDocument)
  const deleteDocument = useDocumentStore((state) => state.deleteDocument)
  const markBackedUp = useDocumentStore((state) => state.markBackedUp)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null)

  useEffect(() => {
    void getStorageEstimate().then(setStorageEstimate)
  }, [])

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Hapus LKPD "${title}"? Tindakan ini tidak bisa dibatalkan.`)) {
      void deleteDocument(id)
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const existingIds = useDocumentStore.getState().documents.map((doc) => doc.id)
    try {
      const imported = await importDocument(file, existingIds)
      await addDocument(imported)
    } catch (error) {
      console.error('Import LKPD gagal:', error)
      setImportError(error instanceof LkpdImportError ? error.message : 'File LKPD tidak valid.')
    } finally {
      event.target.value = ''
    }
  }

  const handleBackupAll = async () => {
    if (backingUp || documents.length === 0) return
    setBackingUp(true)
    setBackupMessage(null)
    try {
      await downloadBackupAll(documents)
      const now = new Date().toISOString()
      for (const document of documents) {
        await markBackedUp(document.id, now)
      }
      setBackupMessage('Backup berhasil.')
    } catch (error) {
      console.error('Backup semua gagal:', error)
      setBackupMessage(error instanceof BackupError ? error.message : 'Backup gagal.')
    } finally {
      setBackingUp(false)
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola LKPD yang sudah Anda buat.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/create">
            <Button>
              <PlusIcon />
              Buat LKPD Baru
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => void handleBackupAll()} disabled={backingUp || documents.length === 0}>
            <ArchiveIcon />
            {backingUp ? 'Menyiapkan backup…' : 'Backup Semua LKPD'}
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <DownloadIcon />
            Import LKPD
          </Button>
        </div>
      </div>

      {backupMessage && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {backupMessage}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".lkpd,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileTextIcon className="text-5xl" />}
          title="Belum ada LKPD"
          description="Mulai dengan membuat LKPD baru, memuat LKPD contoh, atau impor file .lkpd untuk membuka dokumen yang dibagikan."
          actions={
            <>
              <Link to="/create">
                <Button>
                  <PlusIcon />
                  Buat LKPD
                </Button>
              </Link>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <DownloadIcon />
                Import LKPD
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void addDocument(createSampleDocument()).then(() => navigate('/'))
                }}
              >
                Muat LKPD Contoh
              </Button>
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => {
            const template = getTemplateById(document.templateId)
            const pageCount = paginateBlocks(document.blocks, template).length
            return (
              <div key={document.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    <FileTextIcon />
                    {pageCount > 0 ? `${pageCount} halaman` : 'Belum ada konten'}
                  </span>
                  <button
                    type="button"
                    className="text-slate-400 transition-colors hover:text-red-600"
                    onClick={() => handleDelete(document.id, document.metadata.title || 'Tanpa judul')}
                    aria-label={`Hapus ${document.metadata.title}`}
                  >
                    <TrashIcon />
                  </button>
                </div>

                <h2 className="text-base font-semibold text-slate-900">
                  {document.metadata.title || 'Tanpa judul'}
                </h2>

                <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                  {document.metadata.subject && (
                    <p>
                      {document.metadata.subject}
                      {document.metadata.classLevel && ` • Kelas ${document.metadata.classLevel}`}
                    </p>
                  )}
                  {document.metadata.major && <p>{document.metadata.major}</p>}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">Diedit {formatDate(document.updatedAt)}</span>
                  <span className="text-xs font-medium" style={{ color: template.colors.primary }}>
                    {template.name}
                  </span>
                </div>

                <Link to={`/editor/${document.id}`} className="mt-3">
                  <Button variant="secondary" className="w-full">
                    <ArrowLeftIcon className="rotate-180" />
                    Buka Editor
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {storageEstimate && (
        <div className="mt-8 space-y-1 text-xs text-slate-400">
          <p>
            Penyimpanan lokal: <span className="font-medium text-slate-600">{formatBytes(storageEstimate.usage)}</span>{' '}
            dipakai · sekitar{' '}
            <span className="font-medium text-slate-600">{formatBytes(storageEstimate.quota)}</span> tersedia.
          </p>
          <p>{STORAGE_LIMIT_COPY}</p>
        </div>
      )}

      <Modal
        open={importError !== null}
        title="Import LKPD"
        onClose={() => setImportError(null)}
        footer={
          <Button variant="secondary" onClick={() => setImportError(null)}>
            Tutup
          </Button>
        }
      >
        <p className="text-sm text-slate-700">{importError}</p>
      </Modal>
    </div>
  )
}
