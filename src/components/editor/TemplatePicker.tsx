import { useEffect, useState } from 'react'
import type { LKPDTemplate } from '../../models/template'
import { TEMPLATES } from '../../templates'
import { Button } from '../ui/Button'

interface TemplatePickerProps {
  value: string
  onChange: (templateId: string) => void
}

// Thumbnail A4 yang merepresentasikan desain template: memakai background
// image asli untuk template bergambar, dan elemen tiruan (header, baris teks,
// placeholder gambar, opsi) untuk semua template. Murni visual — tidak pernah
// mengubah dokumen.
function TemplateThumb({ template }: { template: LKPDTemplate }) {
  const pad = template.contentArea ?? template.margins
  const mmToPx = 0.72
  const header = template.components.header
  const headerLine = header.borderColor || template.colors.primary
  const titleColor = header.titleColor || template.colors.primary

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '210 / 297', backgroundColor: template.colors.background, color: template.colors.text }}
    >
      {template.backgroundImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${template.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
      <div
        className="relative flex h-full flex-col"
        style={{
          padding: `${pad.top * mmToPx}px ${pad.right * mmToPx}px ${pad.bottom * mmToPx}px ${pad.left * mmToPx}px`,
        }}
      >
        {/* Header tiruan */}
        <div style={{ borderBottom: `1.5px solid ${headerLine}`, paddingBottom: 3, marginBottom: 5 }}>
          <div style={{ height: 5, width: '68%', borderRadius: 2, backgroundColor: titleColor, opacity: 0.9 }} />
          <div style={{ height: 3, width: '46%', borderRadius: 2, backgroundColor: template.colors.muted, marginTop: 3, opacity: 0.65 }} />
        </div>
        {/* Paragraf + placeholder gambar */}
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {['100%', '92%', '88%', '58%'].map((width, index) => (
              <div key={index} style={{ height: 3.5, width, borderRadius: 2, backgroundColor: template.colors.border, marginTop: index === 0 ? 0 : 3 }} />
            ))}
          </div>
          <div style={{ width: 34, borderRadius: 3, backgroundColor: template.colors.border, opacity: 0.7 }} />
        </div>
        {/* Soal tiruan */}
        <div style={{ marginTop: 6 }}>
          <div style={{ height: 3.5, width: '78%', borderRadius: 2, backgroundColor: template.colors.border }} />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: template.components.question.numberBg || template.colors.primary,
                  flexShrink: 0,
                }}
              />
              <span style={{ height: 3, flex: 1, borderRadius: 2, backgroundColor: template.colors.border, opacity: 0.9 }} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* Footer tiruan */}
        <div style={{ borderTop: `1px solid ${template.colors.border}`, paddingTop: 3, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ height: 2.5, width: '22%', borderRadius: 2, backgroundColor: template.colors.muted, opacity: 0.55 }} />
          <div style={{ height: 2.5, width: '14%', borderRadius: 2, backgroundColor: template.colors.muted, opacity: 0.55 }} />
        </div>
      </div>
    </div>
  )
}

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  const [selectedId, setSelectedId] = useState(value)

  // Sinkronkan pilihan lokal jika template dokumen berubah dari luar
  // (mis. "Gunakan Template" diterapkan, atau dokumen lain dibuka).
  useEffect(() => {
    setSelectedId(value)
  }, [value])

  const selected = TEMPLATES.find((template) => template.id === selectedId) ?? TEMPLATES[0]
  const current = TEMPLATES.find((template) => template.id === value) ?? TEMPLATES[0]
  const hasSelection = selectedId !== value

  const handleUse = () => {
    if (hasSelection) onChange(selectedId)
  }

  const handleCancel = () => setSelectedId(value)

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Template saat ini: <span className="font-semibold text-slate-700">{current.name}</span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((template) => {
          const isCurrent = template.id === value
          const isSelected = template.id === selectedId
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              aria-pressed={isSelected}
              className={`relative overflow-hidden rounded-lg border bg-white text-left transition-colors ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <TemplateThumb template={template} />
              <div className="p-2.5">
                <p className="truncate text-xs font-semibold text-slate-800">{template.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{template.description}</p>
              </div>
              {isCurrent && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Aktif
                </span>
              )}
            </button>
          )
        })}
      </div>

      {hasSelection && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-700">Preview: {selected.name}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-blue-600">{selected.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleUse}>
              Gunakan Template
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCancel}>
              Batalkan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
