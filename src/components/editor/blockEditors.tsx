import type { ChangeEvent } from 'react'
import type {
  GalleryImage,
  HeadingBlock,
  ImageBlock,
  ImageGalleryBlock,
  MaterialBlock,
  PageBreakBlock,
  QuestionBlock,
  TextBlock,
} from '../../models/lkpd'
import {
  createEssayQuestion,
  createMultipleChoiceQuestion,
} from '../../lib/factories'
import { optionLetter } from '../../lib/format'
import { useImageSource } from '../../hooks/useImageSource'
import { deleteImageRef, uploadBlockImage, uploadGalleryImages } from '../../services/imageService'
import {
  GALLERY_COLUMN_OPTIONS,
  GALLERY_GAP_OPTIONS,
  GALLERY_LAYOUT_OPTIONS,
  GALLERY_PLACEMENT_OPTIONS,
  GALLERY_WIDTH_OPTIONS,
  parseGalleryColumns,
  resolveGalleryPlacement,
} from '../../lib/gallery'
import {
  IMAGE_PLACEMENT_OPTIONS,
  IMAGE_WIDTH_OPTIONS,
  resolveImagePlacement,
  resolveImageWidth,
} from '../../lib/imagePlacement'
import { Button } from '../ui/Button'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ImageIcon,
  ListIcon,
  LinesIcon,
  TrashIcon,
} from '../ui/icons'
import { Input, Label, Select, Textarea } from '../ui/inputs'

// Thumbnail galeri dengan resolusi referensi Blob IndexedDB.
function GalleryThumb({ src, alt }: { src: string; alt: string }) {
  const { src: resolved } = useImageSource(src)
  if (!resolved) return <div className="h-16 w-16 shrink-0 rounded bg-slate-100" />
  return <img src={resolved} alt={alt} className="h-16 w-16 shrink-0 rounded object-cover" />
}

export function HeadingBlockEditor({
  block,
  onChange,
}: {
  block: HeadingBlock
  onChange: (next: HeadingBlock) => void
}) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <div>
        <Label htmlFor={`heading-level-${block.id}`}>Level</Label>
        <Select
          id={`heading-level-${block.id}`}
          value={block.level}
          onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 1 | 2 | 3 })}
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </Select>
      </div>
      <div>
        <Label htmlFor={`heading-text-${block.id}`}>Teks</Label>
        <Input
          id={`heading-text-${block.id}`}
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          placeholder="Judul bagian"
        />
      </div>
    </div>
  )
}

export function TextBlockEditor({ block, onChange }: { block: TextBlock; onChange: (next: TextBlock) => void }) {
  return (
    <Textarea
      value={block.text}
      onChange={(event) => onChange({ ...block, text: event.target.value })}
      rows={3}
      placeholder="Tulis teks paragraf di sini..."
    />
  )
}

export function QuestionBlockEditor({
  block,
  onChange,
  onAddGallery,
}: {
  block: QuestionBlock
  onChange: (next: QuestionBlock) => void
  onAddGallery?: (questionId: string) => void
}) {
  const convertToEssay = () => {
    const next = createEssayQuestion()
    onChange({ ...next, id: block.id, text: block.text })
  }

  const convertToMultipleChoice = () => {
    const next = createMultipleChoiceQuestion()
    onChange({ ...next, id: block.id, text: block.text })
  }

  const galleryButton = onAddGallery ? (
    <Button variant="secondary" size="sm" onClick={() => onAddGallery(block.id)}>
      <ImageIcon />
      Tambah Gallery
    </Button>
  ) : null

  if (block.questionType === 'multiple_choice') {
    const updateOption = (index: number, value: string) =>
      onChange({ ...block, options: block.options.map((option, i) => (i === index ? value : option)) })
    const addOption = () => onChange({ ...block, options: [...block.options, ''] })
    const removeOption = (index: number) => onChange({ ...block, options: block.options.filter((_, i) => i !== index) })

    return (
      <div className="space-y-2">
        <Label>Soal</Label>
        <Textarea
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          rows={2}
          placeholder="Tulis pertanyaan..."
        />
        <Label>Pilihan Jawaban</Label>
        <div className="space-y-1.5">
          {block.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-sm font-semibold text-slate-600">{optionLetter(index)}</span>
              <Input
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Opsi ${optionLetter(index)}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
                disabled={block.options.length <= 2}
                aria-label={`Hapus opsi ${optionLetter(index)}`}
              >
                <TrashIcon />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={addOption}>
            <ListIcon />
            Tambah Opsi
          </Button>
          <Button variant="ghost" size="sm" onClick={convertToEssay}>
            <LinesIcon />
            Ubah ke Uraian
          </Button>
        </div>
        {galleryButton}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Soal</Label>
      <Textarea
        value={block.text}
        onChange={(event) => onChange({ ...block, text: event.target.value })}
        rows={2}
        placeholder="Tulis pertanyaan..."
      />
      <div>
        <Label htmlFor={`essay-lines-${block.id}`}>Baris Jawaban</Label>
        <Input
          id={`essay-lines-${block.id}`}
          type="number"
          min={1}
          max={20}
          value={block.answerSpace.lines}
          onChange={(event) => {
            const lines = Math.min(20, Math.max(1, Number(event.target.value) || 1))
            onChange({ ...block, answerSpace: { lines } })
          }}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={convertToMultipleChoice}>
        <ListIcon />
        Ubah ke Pilihan Ganda
      </Button>
      {galleryButton}
    </div>
  )
}

export function ImageBlockEditor({
  block,
  onChange,
  questions,
  documentId,
}: {
  block: ImageBlock
  onChange: (next: ImageBlock) => void
  questions: { id: string; number: number }[]
  documentId: string
}) {
  const { src, loading } = useImageSource(block.url)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const uploaded = await uploadBlockImage(file, documentId)
      onChange({ ...block, url: uploaded.url, alt: file.name, source: 'upload' })
    } catch (error) {
      console.error('Gagal mengunggah gambar:', error)
    }
    event.target.value = ''
  }

  const handleRemove = async () => {
    try {
      await deleteImageRef(block.url)
    } catch (error) {
      console.error('Gagal menghapus gambar:', error)
    }
    onChange({ ...block, url: '', source: 'upload' })
  }

  return (
    <div className="space-y-2">
      {block.url ? (
        <div className="space-y-2">
          {src ? (
            <img src={src} alt={block.alt} className="max-h-40 w-full rounded-lg border border-slate-200 object-contain" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
              {loading ? 'Memuat gambar…' : 'Gambar tidak dapat dimuat.'}
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <ImageIcon />
              Ganti Gambar
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            <Button variant="ghost" size="sm" onClick={() => void handleRemove()}>
              <TrashIcon />
              Hapus
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500 hover:border-slate-400">
          <ImageIcon className="text-2xl" />
          Klik untuk upload gambar
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
      <div>
        <Label htmlFor={`image-caption-${block.id}`}>Keterangan (caption)</Label>
        <Input
          id={`image-caption-${block.id}`}
          value={block.caption}
          onChange={(event) => onChange({ ...block, caption: event.target.value })}
          placeholder="Gambar ..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`image-question-${block.id}`}>Kaitkan dengan Soal</Label>
          <Select
            id={`image-question-${block.id}`}
            value={block.questionId ?? ''}
            onChange={(event) => {
              const questionId = event.target.value || undefined
              onChange({ ...block, questionId })
            }}
          >
            <option value="">Tidak terkait</option>
            {questions.map((question) => (
              <option key={question.id} value={question.id}>
                Soal {question.number}
              </option>
            ))}
          </Select>
          {questions.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">Belum ada soal pada dokumen ini.</p>
          )}
        </div>
        <div>
          <Label htmlFor={`image-placement-${block.id}`}>Posisi gambar</Label>
          <Select
            id={`image-placement-${block.id}`}
            value={resolveImagePlacement(block)}
            disabled={!block.questionId}
            onChange={(event) => onChange({ ...block, placement: event.target.value as ImageBlock['placement'] })}
          >
            {IMAGE_PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-400">
            {block.questionId ? 'Relatif terhadap content area soal.' : 'Kaitkan gambar ke soal untuk mengatur posisi.'}
          </p>
        </div>
        <div>
          <Label htmlFor={`image-width-${block.id}`}>Ukuran</Label>
          <Select
            id={`image-width-${block.id}`}
            value={resolveImageWidth(block)}
            onChange={(event) => onChange({ ...block, width: event.target.value as ImageBlock['width'] })}
          >
            {IMAGE_WIDTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  )
}

export function MaterialBlockEditor({ block, onChange }: { block: MaterialBlock; onChange: (next: MaterialBlock) => void }) {
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`material-title-${block.id}`}>Judul materi</Label>
        <Input
          id={`material-title-${block.id}`}
          value={block.title}
          onChange={(event) => onChange({ ...block, title: event.target.value })}
          placeholder="Contoh: JARINGAN KOMPUTER"
        />
      </div>
      <div>
        <Label htmlFor={`material-content-${block.id}`}>Isi materi</Label>
        <Textarea
          id={`material-content-${block.id}`}
          value={block.content}
          onChange={(event) => onChange({ ...block, content: event.target.value })}
          rows={10}
          placeholder="Tempel atau tulis materi panjang di sini. Paragraf dan baris baru dipertahankan."
        />
      </div>
    </div>
  )
}

export function ImageGalleryBlockEditor({
  block,
  onChange,
  questions,
  documentId,
}: {
  block: ImageGalleryBlock
  onChange: (next: ImageGalleryBlock) => void
  questions: { id: string; number: number }[]
  documentId: string
}) {
  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const additions = await uploadGalleryImages(files, documentId)
    if (additions.length > 0) {
      onChange({
        ...block,
        images: [...block.images, ...additions].map((image, index) => ({ ...image, order: index + 1 })),
      })
    }
    event.target.value = ''
  }

  const update = (index: number, patch: Partial<GalleryImage>) => {
    onChange({
      ...block,
      images: block.images.map((image, i) => (i === index ? { ...image, ...patch } : image)),
    })
  }

  const move = (index: number, direction: -1 | 1) => {
    const images = [...block.images]
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const [moved] = images.splice(index, 1)
    images.splice(target, 0, moved)
    onChange({ ...block, images: images.map((image, i) => ({ ...image, order: i + 1 })) })
  }

  const remove = async (index: number) => {
    const image = block.images[index]
    try {
      await deleteImageRef(image?.src)
    } catch (error) {
      console.error('Gagal menghapus gambar:', error)
    }
    onChange({
      ...block,
      images: block.images.filter((_, i) => i !== index).map((image, i) => ({ ...image, order: i + 1 })),
    })
  }

  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`gallery-question-${block.id}`}>Kaitkan dengan Soal</Label>
        <Select
          id={`gallery-question-${block.id}`}
          value={block.questionId}
          onChange={(event) => onChange({ ...block, questionId: event.target.value })}
        >
          <option value="">Tidak terkait</option>
          {questions.map((question) => (
            <option key={question.id} value={question.id}>
              Soal {question.number}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`gallery-placement-${block.id}`}>Posisi</Label>
          <Select
            id={`gallery-placement-${block.id}`}
            value={resolveGalleryPlacement(block)}
            onChange={(event) => onChange({ ...block, placement: event.target.value as ImageGalleryBlock['placement'] })}
          >
            {GALLERY_PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`gallery-layout-${block.id}`}>Layout</Label>
          <Select
            id={`gallery-layout-${block.id}`}
            value={block.layout}
            onChange={(event) => onChange({ ...block, layout: event.target.value as ImageGalleryBlock['layout'] })}
          >
            {GALLERY_LAYOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`gallery-columns-${block.id}`}>Kolom</Label>
          <Select
            id={`gallery-columns-${block.id}`}
            value={String(block.columns)}
            onChange={(event) => onChange({ ...block, columns: parseGalleryColumns(event.target.value) })}
          >
            {GALLERY_COLUMN_OPTIONS.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`gallery-gap-${block.id}`}>Jarak antar gambar</Label>
          <Select
            id={`gallery-gap-${block.id}`}
            value={block.gap}
            onChange={(event) => onChange({ ...block, gap: event.target.value as ImageGalleryBlock['gap'] })}
          >
            {GALLERY_GAP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`gallery-width-${block.id}`}>Ukuran gambar</Label>
          <Select
            id={`gallery-width-${block.id}`}
            value={block.width}
            onChange={(event) => onChange({ ...block, width: event.target.value as ImageGalleryBlock['width'] })}
          >
            {GALLERY_WIDTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 hover:border-slate-400">
        <ImageIcon className="text-xl" />
        Upload banyak gambar
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </label>

      {block.images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
          Belum ada gambar di galeri.
        </p>
      ) : (
        <div className="space-y-2">
          {block.images.map((image, index) => (
            <div key={image.id} className="rounded-lg border border-slate-200 p-2">
              <div className="flex items-start gap-2">
                <GalleryThumb src={image.src} alt={image.alt} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Gambar {index + 1}</span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Geser ke atas"
                      >
                        <ChevronUpIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => move(index, 1)}
                        disabled={index === block.images.length - 1}
                        aria-label="Geser ke bawah"
                      >
                        <ChevronDownIcon />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(index)} aria-label="Hapus gambar">
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={image.caption}
                    onChange={(event) => update(index, { caption: event.target.value })}
                    placeholder="Caption (opsional)"
                  />
                  <Input
                    value={image.alt}
                    onChange={(event) => update(index, { alt: event.target.value })}
                    placeholder="Teks alternatif (alt)"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PageBreakBlockEditor({ block: _block }: { block: PageBreakBlock }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-xs text-slate-500">
      Konten setelah ini akan dimulai pada halaman baru.
    </p>
  )
}
