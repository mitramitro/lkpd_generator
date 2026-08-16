import { create } from 'zustand'
import type { Block, LKPDDocument, LKPDMetadata } from '../models/lkpd'
import { createEmptyDocument, renumberQuestions } from '../lib/factories'
import { applyTemplate } from '../lib/template'
import { imageIdFromReference, isImageReference, materializeDataUrls } from '../lib/imageStorage'
import { storageFailureMessage } from '../lib/storageInfo'
import { getRepository } from '../services/repositoryProvider'

export type ImportMode = 'append' | 'replace'
export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

const SAVE_DEBOUNCE_MS = 800

let saveTimer: ReturnType<typeof setTimeout> | undefined

function imageRefsInBlock(block: Block): string[] {
  if (block.type === 'image' && isImageReference(block.url)) {
    const imageId = imageIdFromReference(block.url)
    return imageId ? [imageId] : []
  }
  if (block.type === 'image_gallery') {
    return block.images.flatMap((image) => {
      if (!isImageReference(image.src)) return []
      const imageId = imageIdFromReference(image.src)
      return imageId ? [imageId] : []
    })
  }
  return []
}

function deleteImageRefs(imageIds: string[]): void {
  if (imageIds.length === 0) return
  void getRepository()
    .then((repo) => Promise.all(imageIds.map((imageId) => repo.deleteImage(imageId))))
    .catch((error) => console.error('Gagal menghapus blob gambar:', error))
}

// Auto-save debounce: simpan ~800ms setelah perubahan terakhir berhenti,
// bukan setiap keystroke.
function schedulePersist(documentId: string): void {
  useDocumentStore.setState({ saveStatus: 'pending', saveError: null })
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const latest = useDocumentStore.getState().documents.find((document) => document.id === documentId)
    if (latest) void persistDocument(latest)
  }, SAVE_DEBOUNCE_MS)
}

async function persistDocument(document: LKPDDocument): Promise<void> {
  useDocumentStore.setState({ saveStatus: 'saving' })
  try {
    const repo = await getRepository()
    const prepared = await materializeDataUrls(document, repo)
    if (prepared !== document) {
      useDocumentStore.setState((state) => ({
        documents: state.documents.map((item) => (item.id === prepared.id ? prepared : item)),
      }))
    }
    await repo.save(prepared)
    useDocumentStore.setState({ saveStatus: 'saved', lastSavedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Gagal menyimpan dokumen:', error)
    useDocumentStore.setState({ saveStatus: 'error', saveError: storageFailureMessage() })
  }
}

function touch(document: LKPDDocument): LKPDDocument {
  return { ...document, updatedAt: new Date().toISOString() }
}

interface DocumentStore {
  documents: LKPDDocument[]
  ready: boolean
  saveStatus: SaveStatus
  saveError: string | null
  lastSavedAt: string | null
  loadAll: () => Promise<void>
  createDocument: (metadata: LKPDMetadata, templateId: string) => LKPDDocument
  addDocument: (document: LKPDDocument) => Promise<void>
  updateMetadata: (id: string, metadata: LKPDMetadata) => void
  setTemplate: (id: string, templateId: string) => void
  addBlock: (id: string, block: Block) => void
  insertBlockAfter: (id: string, afterBlockId: string, block: Block) => void
  replaceBlock: (id: string, block: Block) => void
  removeBlock: (id: string, blockId: string) => void
  moveBlock: (id: string, blockId: string, direction: -1 | 1) => void
  importBlocks: (id: string, mode: ImportMode, blocks: Block[]) => void
  deleteDocument: (id: string) => Promise<void>
  markBackedUp: (id: string, at: string) => Promise<void>
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  ready: false,
  saveStatus: 'saved',
  saveError: null,
  lastSavedAt: null,

  loadAll: async () => {
    try {
      const repo = await getRepository()
      const documents = await repo.list()
      documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      set({ documents, ready: true })
    } catch (error) {
      console.error('Gagal memuat data lokal:', error)
      set({ ready: true })
    }
  },

  createDocument: (metadata, templateId) => {
    const document = createEmptyDocument(metadata, templateId)
    set((state) => ({ documents: [document, ...state.documents] }))
    void getRepository()
      .then((repo) => repo.save(document))
      .catch((error) => {
        console.error('Gagal menyimpan dokumen baru:', error)
        useDocumentStore.setState({ saveStatus: 'error', saveError: storageFailureMessage() })
      })
    return document
  },

  addDocument: async (document) => {
    const repo = await getRepository()
    const prepared = await materializeDataUrls(document, repo)
    set((state) => ({ documents: [prepared, ...state.documents] }))
    await repo.save(prepared)
  },

  updateMetadata: (id, metadata) => {
    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const next = touch({ ...document, metadata })
        schedulePersist(id)
        return next
      }),
    }))
  },

  setTemplate: (id, templateId) => {
    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const next = applyTemplate(document, templateId)
        schedulePersist(id)
        return next
      }),
    }))
  },

  addBlock: (id, block) => {
    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const next = touch({ ...document, blocks: renumberQuestions([...document.blocks, block]) })
        schedulePersist(id)
        return next
      }),
    }))
  },

  insertBlockAfter: (id, afterBlockId, block) => {
    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const blocks = [...document.blocks]
        const index = blocks.findIndex((item) => item.id === afterBlockId)
        const insertAt = index === -1 ? blocks.length : index + 1
        blocks.splice(insertAt, 0, block)
        const next = touch({ ...document, blocks: renumberQuestions(blocks) })
        schedulePersist(id)
        return next
      }),
    }))
  },

  replaceBlock: (id, block) => {
    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const next = touch({
          ...document,
          blocks: renumberQuestions(document.blocks.map((item) => (item.id === block.id ? block : item))),
        })
        schedulePersist(id)
        return next
      }),
    }))
  },

  removeBlock: (id, blockId) => {
    const block = useDocumentStore
      .getState()
      .documents.find((document) => document.id === id)
      ?.blocks.find((item) => item.id === blockId)
    if (block) deleteImageRefs(imageRefsInBlock(block))

    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const next = touch({ ...document, blocks: renumberQuestions(document.blocks.filter((item) => item.id !== blockId)) })
        schedulePersist(id)
        return next
      }),
    }))
  },

  moveBlock: (id, blockId, direction) => {
    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const blocks = [...document.blocks]
        const index = blocks.findIndex((item) => item.id === blockId)
        const target = index + direction
        if (index === -1 || target < 0 || target >= blocks.length) return document
        const [moved] = blocks.splice(index, 1)
        blocks.splice(target, 0, moved)
        const next = touch({ ...document, blocks: renumberQuestions(blocks) })
        schedulePersist(id)
        return next
      }),
    }))
  },

  deleteDocument: async (id) => {
    const repo = await getRepository()
    try {
      await repo.deleteImagesByDocument(id)
    } catch (error) {
      console.error('Gagal menghapus gambar project:', error)
    }
    await repo.remove(id)
    set((state) => ({ documents: state.documents.filter((document) => document.id !== id) }))
  },

  importBlocks: (id, mode, blocks) => {
    set((state) => ({
      documents: state.documents.map((document) => {
        if (document.id !== id) return document
        const existing = mode === 'replace' ? document.blocks.filter((block) => block.type !== 'question') : document.blocks
        const next = touch({ ...document, blocks: renumberQuestions([...existing, ...blocks]) })
        schedulePersist(id)
        return next
      }),
    }))
  },

  markBackedUp: async (id, at) => {
    const document = useDocumentStore.getState().documents.find((item) => item.id === id)
    if (!document) return
    const next = { ...document, lastBackupAt: at }
    set((state) => ({ documents: state.documents.map((item) => (item.id === id ? next : item)) }))
    try {
      const repo = await getRepository()
      await repo.save(next)
    } catch (error) {
      console.error('Gagal menyimpan metadata backup:', error)
    }
  },
}))
