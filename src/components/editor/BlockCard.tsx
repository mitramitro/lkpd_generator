import type { ReactElement } from 'react'
import type { Block } from '../../models/lkpd'
import { Button } from '../ui/Button'
import {
  BookIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeadingIcon,
  ImageIcon,
  LinesIcon,
  ListIcon,
  PageBreakIcon,
  ParagraphIcon,
  TrashIcon,
} from '../ui/icons'
import {
  HeadingBlockEditor,
  ImageBlockEditor,
  ImageGalleryBlockEditor,
  MaterialBlockEditor,
  PageBreakBlockEditor,
  QuestionBlockEditor,
  TextBlockEditor,
} from './blockEditors'

interface BlockCardProps {
  block: Block
  index: number
  count: number
  documentId: string
  questions: { id: string; number: number }[]
  onChange: (block: Block) => void
  onRemove: (blockId: string) => void
  onMove: (blockId: string, direction: -1 | 1) => void
  onAddGallery: (questionId: string) => void
}

function blockMeta(block: Block): { label: string; icon: ReactElement } {
  switch (block.type) {
    case 'heading':
      return { label: `Heading ${block.level}`, icon: <HeadingIcon /> }
    case 'text':
      return { label: 'Teks', icon: <ParagraphIcon /> }
    case 'question':
      return block.questionType === 'multiple_choice'
        ? { label: `Soal ${block.number} • Pilihan Ganda`, icon: <ListIcon /> }
        : { label: `Soal ${block.number} • Uraian`, icon: <LinesIcon /> }
    case 'image':
      return { label: 'Gambar', icon: <ImageIcon /> }
    case 'image_gallery':
      return { label: 'Galeri Gambar', icon: <ImageIcon /> }
    case 'material':
      return { label: 'Materi', icon: <BookIcon /> }
    case 'page_break':
      return { label: 'Halaman Baru', icon: <PageBreakIcon /> }
  }
}

export function BlockCard({ block, index, count, documentId, questions, onChange, onRemove, onMove, onAddGallery }: BlockCardProps) {
  const { label, icon } = blockMeta(block)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="text-slate-400">{icon}</span>
          {label}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => onMove(block.id, -1)} disabled={index === 0} aria-label="Pindah ke atas">
            <ChevronUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(block.id, 1)}
            disabled={index === count - 1}
            aria-label="Pindah ke bawah"
          >
            <ChevronDownIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(block.id)} aria-label="Hapus block">
            <TrashIcon />
          </Button>
        </div>
      </div>
      <div className="p-3">
        {block.type === 'heading' && <HeadingBlockEditor block={block} onChange={onChange} />}
        {block.type === 'text' && <TextBlockEditor block={block} onChange={onChange} />}
        {block.type === 'question' && (
          <QuestionBlockEditor block={block} onChange={onChange} onAddGallery={onAddGallery} />
        )}
        {block.type === 'image' && <ImageBlockEditor block={block} onChange={onChange} questions={questions} documentId={documentId} />}
        {block.type === 'image_gallery' && <ImageGalleryBlockEditor block={block} onChange={onChange} questions={questions} documentId={documentId} />}
        {block.type === 'material' && <MaterialBlockEditor block={block} onChange={onChange} />}
        {block.type === 'page_break' && <PageBreakBlockEditor block={block} />}
      </div>
    </div>
  )
}
