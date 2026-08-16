import { useMemo, useRef, useState } from 'react'
import type { CustomBackgroundMeta, LKPDDocument, PageBackgroundConfig } from '../../models/lkpd'
import { paginateBlocks } from '../../lib/pagination'
import { paginationContentArea } from '../../lib/backgrounds'
import { makeImageReference } from '../../lib/imageStorage'
import { useImageSource } from '../../hooks/useImageSource'
import { getRepository } from '../../services/repositoryProvider'
import { BackgroundUploadError, uploadCustomBackground } from '../../services/backgroundService'
import { TEMPLATES } from '../../templates'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ImageIcon, UploadIcon } from '../ui/icons'

// M5.3.1 — panel pengaturan background halaman (default dokumen, per halaman,
// dan pustaka background custom + upload).

interface BackgroundPanelProps {
  document: LKPDDocument
  onSetDefault: (config?: PageBackgroundConfig) => void
  onSetPage: (pageNumber: number, config?: PageBackgroundConfig) => void
  onAddCustom: (meta: CustomBackgroundMeta) => void
}

interface BackgroundOption {
  value: string
  label: string
}

function configFromSelect(value: string): PageBackgroundConfig | undefined {
  if (!value) return undefined
  if (value.startsWith('custom:')) return { mode: 'custom', imageId: value.slice('custom:'.length) }
  return { mode: 'builtin', backgroundId: value }
}

function selectFromConfig(config: PageBackgroundConfig | undefined): string {
  if (!config) return ''
  if (config.mode === 'custom') return config.imageId ? `custom:${config.imageId}` : ''
  if (config.mode === 'builtin') return config.backgroundId ?? ''
  return ''
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function buildOptions(customBackgrounds: CustomBackgroundMeta[] | undefined, defaultLabel: string): BackgroundOption[] {
  const options: BackgroundOption[] = [{ value: '', label: defaultLabel }]
  for (const template of TEMPLATES) {
    if (!template.backgroundImage) continue
    options.push({ value: template.id, label: template.name })
  }
  for (const meta of customBackgrounds ?? []) {
    options.push({ value: `custom:${meta.id}`, label: `Background Saya: ${meta.filename}` })
  }
  return options
}

export function BackgroundPanel({ document, onSetDefault, onSetPage, onAddCustom }: BackgroundPanelProps) {
  const template = TEMPLATES.find((item) => item.id === document.templateId) ?? TEMPLATES[0]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMeta, setPreviewMeta] = useState<CustomBackgroundMeta | null>(null)

  // Jumlah halaman memakai estimasi pagination yang SAMA dengan preview
  // (area efektif dari background), sehingga "Background Halaman" selalu akurat.
  const pageCount = useMemo(
    () => paginateBlocks(document.blocks, template, paginationContentArea(document, template)).length,
    [document, template],
  )

  const defaultLabel = document.background ? 'Default Dokumen' : 'Default Template'
  const options = useMemo(
    () => buildOptions(document.customBackgrounds, defaultLabel),
    [document.customBackgrounds, defaultLabel],
  )

  const customBackgrounds = document.customBackgrounds ?? []

  const preview = useImageSource(previewMeta ? makeImageReference(previewMeta.id) : undefined)

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const repo = await getRepository()
      if (!repo.supportsBlobImages) {
        setError('Penyimpanan gambar tidak tersedia di perangkat ini. Upload background tidak dapat dilakukan.')
        return
      }
      const meta = await uploadCustomBackground(file, document.id, repo)
      onAddCustom(meta)
      setPreviewMeta(meta)
    } catch (uploadError) {
      setError(uploadError instanceof BackgroundUploadError ? uploadError.message : 'Upload background gagal.')
    } finally {
      setUploading(false)
    }
  }

  const handleUsePreview = () => {
    if (!previewMeta) return
    onSetDefault({ mode: 'custom', imageId: previewMeta.id })
    setPreviewMeta(null)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-400">
        Background hanya sebagai tampilan halaman dan tidak memengaruhi isi soal.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">Default Dokumen</label>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          value={selectFromConfig(document.background)}
          onChange={(event) => onSetDefault(configFromSelect(event.target.value))}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">Background Halaman</label>
        {pageCount === 0 ? (
          <p className="text-xs text-slate-400">Belum ada halaman untuk diatur.</p>
        ) : (
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <div key={pageNumber} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-slate-500">Halaman {pageNumber}</span>
                <select
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  value={selectFromConfig(document.pageBackgrounds?.[String(pageNumber)])}
                  onChange={(event) => onSetPage(pageNumber, configFromSelect(event.target.value))}
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">Background Saya</label>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <UploadIcon />
            {uploading ? 'Mengunggah…' : 'Upload Background'}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleUpload(event.target.files?.[0])}
        />
        <p className="text-xs text-slate-400">Gunakan gambar portrait/A4 agar hasil terbaik.</p>

        {customBackgrounds.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
            Belum ada background custom.
          </p>
        ) : (
          <ul className="space-y-2">
            {customBackgrounds.map((meta) => (
              <li key={meta.id} className="flex items-center gap-2.5 rounded-md border border-slate-200 p-2">
                <CustomThumbnail imageId={meta.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">{meta.filename}</p>
                  <p className="text-[11px] text-slate-400">
                    {meta.width}×{meta.height}px · {formatBytes(meta.size)}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setPreviewMeta(meta)}>
                  Gunakan
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <Modal
        open={previewMeta !== null}
        title="Preview Background"
        onClose={() => setPreviewMeta(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewMeta(null)}>
              Batal
            </Button>
            <Button onClick={handleUsePreview}>Gunakan sebagai Default</Button>
          </>
        }
      >
        {previewMeta && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div
                className="relative w-40 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                style={{ aspectRatio: '210 / 297' }}
              >
                {preview.src ? (
                  <img src={preview.src} alt={previewMeta.filename} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>
            <p className="truncate text-center text-sm font-medium text-slate-700">{previewMeta.filename}</p>
            <p className="text-center text-xs text-slate-400">
              {previewMeta.width}×{previewMeta.height}px · {formatBytes(previewMeta.size)}
            </p>
            <p className="text-center text-xs text-slate-400">Gunakan gambar portrait/A4 agar hasil terbaik.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function CustomThumbnail({ imageId }: { imageId: string }) {
  const { src } = useImageSource(makeImageReference(imageId))
  if (!src) {
    return (
      <div className="flex h-11 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-slate-300">
        <ImageIcon />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="h-11 w-8 shrink-0 overflow-hidden rounded object-cover"
      loading="lazy"
    />
  )
}
