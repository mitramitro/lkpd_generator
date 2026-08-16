import { useState } from 'react'
import type { ReactElement } from 'react'
import type { Block } from '../../models/lkpd'
import {
  createEssayQuestion,
  createHeadingBlock,
  createImageBlock,
  createImageGalleryBlock,
  createMaterialBlock,
  createMultipleChoiceQuestion,
  createPageBreakBlock,
  createTextBlock,
} from '../../lib/factories'
import { Button } from '../ui/Button'
import {
  BookIcon,
  HeadingIcon,
  ImageIcon,
  LinesIcon,
  ListIcon,
  PageBreakIcon,
  ParagraphIcon,
  PlusIcon,
} from '../ui/icons'

interface BlockTypeOption {
  key: string
  label: string
  description: string
  icon: ReactElement
  create: () => Block
}

const OPTIONS: BlockTypeOption[] = [
  { key: 'heading', label: 'Heading', description: 'Judul bagian', icon: <HeadingIcon />, create: () => createHeadingBlock() },
  { key: 'text', label: 'Teks', description: 'Paragraf / instruksi', icon: <ParagraphIcon />, create: () => createTextBlock() },
  {
    key: 'material',
    label: 'Materi',
    description: 'Judul + isi materi',
    icon: <BookIcon />,
    create: () => createMaterialBlock(),
  },
  {
    key: 'multiple_choice',
    label: 'Soal Pilihan Ganda',
    description: 'Dengan opsi jawaban',
    icon: <ListIcon />,
    create: () => createMultipleChoiceQuestion(),
  },
  { key: 'essay', label: 'Soal Uraian', description: 'Dengan area jawaban', icon: <LinesIcon />, create: () => createEssayQuestion() },
  { key: 'image', label: 'Gambar', description: 'Upload dari perangkat', icon: <ImageIcon />, create: () => createImageBlock() },
  {
    key: 'image_gallery',
    label: 'Galeri Gambar',
    description: 'Banyak gambar dalam grid',
    icon: <ImageIcon />,
    create: () => createImageGalleryBlock(),
  },
  {
    key: 'page_break',
    label: 'Halaman Baru',
    description: 'Paksa pindah halaman',
    icon: <PageBreakIcon />,
    create: () => createPageBreakBlock(),
  },
]

export function AddBlockMenu({ onAdd, size = 'md' }: { onAdd: (block: Block) => void; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false)

  const add = (option: BlockTypeOption) => {
    onAdd(option.create())
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button className="w-full" size={size} onClick={() => setOpen((current) => !current)}>
        <PlusIcon />
        Tambah Block
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-[300px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => add(option)}
                className="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex w-8 shrink-0 items-center justify-center pt-0.5 text-slate-400">{option.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-nowrap text-sm font-medium text-slate-800">{option.label}</span>
                  <span className="block text-xs leading-snug text-slate-500">{option.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
