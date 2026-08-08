import type { Block } from '../../models/lkpd'
import { BlockCard } from './BlockCard'

interface BlockListProps {
  blocks: Block[]
  documentId: string
  questions: { id: string; number: number }[]
  onChange: (block: Block) => void
  onRemove: (blockId: string) => void
  onMove: (blockId: string, direction: -1 | 1) => void
  onAddGallery: (questionId: string) => void
}

export function BlockList({ blocks, documentId, questions, onChange, onRemove, onMove, onAddGallery }: BlockListProps) {
  if (blocks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
        Belum ada konten. Tambahkan block di bawah.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <BlockCard
          key={block.id}
          block={block}
          index={index}
          count={blocks.length}
          documentId={documentId}
          questions={questions}
          onChange={onChange}
          onRemove={onRemove}
          onMove={onMove}
          onAddGallery={onAddGallery}
        />
      ))}
    </div>
  )
}
