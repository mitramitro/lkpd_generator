import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AddBlockMenu } from '../components/editor/AddBlockMenu'
import { BlockList } from '../components/editor/BlockList'
import { ImportMateriModal } from '../components/editor/ImportMateriModal'
import { ImportSoalModal } from '../components/editor/ImportSoalModal'
import { MetadataFields } from '../components/editor/MetadataFields'
import { TemplatePicker } from '../components/editor/TemplatePicker'
import { A4Preview } from '../components/preview/A4Preview'
import { Button } from '../components/ui/Button'
import { SaveStatusBadge } from '../components/ui/SaveStatusBadge'
import { ArrowLeftIcon, BookIcon, FileTextIcon } from '../components/ui/icons'
import { Panel } from '../components/ui/Panel'
import { createImageGalleryBlock, createMaterialBlock } from '../lib/factories'
import { formatDateTime, STORAGE_COPY } from '../lib/storageInfo'
import type { Block, LKPDMetadata } from '../models/lkpd'
import { useDocumentStore, type ImportMode } from '../store/documentStore'
import { getTemplateById } from '../templates'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const [importOpen, setImportOpen] = useState(false)
  const [importMateriOpen, setImportMateriOpen] = useState(false)

  const document = useDocumentStore((state) => state.documents.find((doc) => doc.id === id))
  const updateMetadata = useDocumentStore((state) => state.updateMetadata)
  const setTemplate = useDocumentStore((state) => state.setTemplate)
  const addBlock = useDocumentStore((state) => state.addBlock)
  const insertBlockAfter = useDocumentStore((state) => state.insertBlockAfter)
  const replaceBlock = useDocumentStore((state) => state.replaceBlock)
  const removeBlock = useDocumentStore((state) => state.removeBlock)
  const moveBlock = useDocumentStore((state) => state.moveBlock)
  const importBlocks = useDocumentStore((state) => state.importBlocks)
  const saveStatus = useDocumentStore((state) => state.saveStatus)
  const saveError = useDocumentStore((state) => state.saveError)

  // Saat print (window.print), judul PDF mengikuti judul LKPD. Direset kembali
  // setelah print selesai; tidak ada perubahan state aplikasi permanen.
  useEffect(() => {
    if (!document) return
    const previousTitle = 'LKPD Builder'
    const title = document.metadata.title?.trim()
    const applyPrintTitle = () => {
      window.document.title = title ? `LKPD — ${title}` : 'LKPD Builder'
    }
    const restoreTitle = () => {
      window.document.title = previousTitle
    }
    window.addEventListener('beforeprint', applyPrintTitle)
    window.addEventListener('afterprint', restoreTitle)
    return () => {
      window.removeEventListener('beforeprint', applyPrintTitle)
      window.removeEventListener('afterprint', restoreTitle)
    }
  }, [document])

  if (!document) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-800">Dokumen tidak ditemukan</h1>
        <p className="mt-1 text-sm text-slate-500">LKPD ini mungkin sudah dihapus.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Kembali ke Dashboard</Button>
        </Link>
      </div>
    )
  }

  const template = getTemplateById(document.templateId)

  const handleMetadataChange = (metadata: LKPDMetadata) => updateMetadata(document.id, metadata)
  const handleTemplateChange = (templateId: string) => setTemplate(document.id, templateId)
  const handleAddBlock = (block: Block) => addBlock(document.id, block)
  const handleReplaceBlock = (block: Block) => replaceBlock(document.id, block)
  const handleRemoveBlock = (blockId: string) => removeBlock(document.id, blockId)
  const handleMoveBlock = (blockId: string, direction: -1 | 1) => moveBlock(document.id, blockId, direction)
  const handleImportBlocks = (mode: ImportMode, blocks: Block[]) => importBlocks(document.id, mode, blocks)

  const handleAddGallery = (questionId: string) => {
    insertBlockAfter(document.id, questionId, createImageGalleryBlock(questionId))
  }

  const handleImportMateri = (title: string, content: string) => {
    insertBlockAfter(document.id, document.blocks[document.blocks.length - 1]?.id ?? '', createMaterialBlock(title, content))
  }

  const questions = document.blocks
    .filter((block): block is Extract<Block, { type: 'question' }> => block.type === 'question')
    .map((block) => ({ id: block.id, number: block.number }))

  return (
    <div className="print-flow flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <aside className="no-print w-full shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:w-[400px]">
        <div className="space-y-5 p-4">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              <ArrowLeftIcon />
              Dashboard
            </Link>
            <span className="text-xs text-slate-400">{template.name}</span>
          </div>

          <Panel title="Identitas LKPD">
            <MetadataFields value={document.metadata} onChange={handleMetadataChange} />
          </Panel>

          <Panel title="Template Desain">
            <TemplatePicker value={document.templateId} onChange={handleTemplateChange} />
          </Panel>

          <Panel title="Penyimpanan & Backup">
            <div className="space-y-2">
              <SaveStatusBadge status={saveStatus} error={saveError} />
              {document.lastBackupAt ? (
                <p className="text-xs text-slate-500">
                  Backup terakhir:{' '}
                  <span className="font-medium text-slate-700">{formatDateTime(document.lastBackupAt)}</span>
                </p>
              ) : (
                <p className="text-xs font-medium text-amber-600">⚠️ Belum ada backup file</p>
              )}
              <p className="text-xs leading-relaxed text-slate-400">{STORAGE_COPY}</p>
            </div>
          </Panel>

          <Panel title="Konten LKPD">
            <div className="space-y-3">
              <BlockList
                blocks={document.blocks}
                documentId={document.id}
                questions={questions}
                onChange={handleReplaceBlock}
                onRemove={handleRemoveBlock}
                onMove={handleMoveBlock}
                onAddGallery={handleAddGallery}
              />
              <div className="grid grid-cols-1 gap-2">
                <AddBlockMenu onAdd={handleAddBlock} />
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <FileTextIcon />
                  Import Soal
                </Button>
                <Button variant="secondary" onClick={() => setImportMateriOpen(true)}>
                  <BookIcon />
                  Import Materi
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </aside>

      <main className="h-[60vh] min-w-0 flex-1 overflow-hidden lg:h-auto">
        <A4Preview document={document} />
      </main>

      <ImportSoalModal
        open={importOpen}
        existingCount={questions.length}
        onClose={() => setImportOpen(false)}
        onImport={handleImportBlocks}
      />
      <ImportMateriModal open={importMateriOpen} onClose={() => setImportMateriOpen(false)} onImport={handleImportMateri} />
    </div>
  )
}
