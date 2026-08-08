import { useCallback, useMemo, useState } from 'react'
import type { LKPDDocument } from '../../models/lkpd'
import { pxPerMm } from '../../lib/measure'
import { expandUnitToSlices, groupBlocks, paginateSlices, sliceKey } from '../../lib/pagination'
import { getTemplateById } from '../../templates'
import { downloadBackup } from '../../services/backupService'
import { useDocumentStore } from '../../store/documentStore'
import { Button } from '../ui/Button'
import { SaveStatusBadge } from '../ui/SaveStatusBadge'
import { DownloadIcon, FileTextIcon } from '../ui/icons'
import { A4Page } from './A4Page'
import { MeasureNode } from './MeasureNode'
import { PageFooter } from './PageFooter'
import { PageHeader } from './PageHeader'
import { SliceView } from './UnitView'

const MIN_ZOOM = 0.4
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1

const HEADER_KEY = '__header__'
const FOOTER_KEY = '__footer__'

const HEIGHT_EPSILON_MM = 0.05

export function A4Preview({ document }: { document: LKPDDocument }) {
  const [zoom, setZoom] = useState(0.75)
  const [backingUp, setBackingUp] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const saveStatus = useDocumentStore((state) => state.saveStatus)
  const saveError = useDocumentStore((state) => state.saveError)
  const markBackedUp = useDocumentStore((state) => state.markBackedUp)
  const template = getTemplateById(document.templateId)

  const handleBackup = async () => {
    if (backingUp) return
    setBackingUp(true)
    setBackupError(null)
    try {
      await downloadBackup(document)
      await markBackedUp(document.id, new Date().toISOString())
    } catch (error) {
      console.error('Backup LKPD gagal:', error)
      setBackupError(error instanceof Error ? error.message : 'Backup gagal.')
    } finally {
      setBackingUp(false)
    }
  }

  const mmPerPx = useMemo(() => 1 / pxPerMm(), [])
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [headerMm, setHeaderMm] = useState(0)
  const [footerMm, setFooterMm] = useState(0)

  const reportHeight = useCallback(
    (id: string, heightPx: number) => {
      // Saat print (window.print), kontainer pengukur di-display:none sehingga
      // ResizeObserver melaporkan tinggi 0. Jika nilai 0 dipakai, semua slice
      // dianggap setinggi 0mm → pagination runtuh jadi 1 halaman raksasa yang
      // meluber jauh melampaui box 297mm, membuat print-to-PDF sangat lambat.
      // Ukuran non-positif selalu diabaikan (konten asli selalu > 0).
      if (heightPx <= 0) return
      const mm = heightPx * mmPerPx
      if (id === HEADER_KEY) {
        setHeaderMm((prev) => (Math.abs(prev - mm) < HEIGHT_EPSILON_MM ? prev : mm))
        return
      }
      if (id === FOOTER_KEY) {
        setFooterMm((prev) => (Math.abs(prev - mm) < HEIGHT_EPSILON_MM ? prev : mm))
        return
      }
      setHeights((prev) => (Math.abs((prev[id] ?? -1) - mm) < HEIGHT_EPSILON_MM ? prev : { ...prev, [id]: mm }))
    },
    [mmPerPx],
  )

  // Pagination dihitung ulang setiap kali ukuran berubah (derived state,
  // bukan disimpan permanen). Heights fallback ke estimasi saat pengukuran belum siap.
  const units = useMemo(() => groupBlocks(document.blocks), [document.blocks])
  const contentWidthMm = template.pageWidth - template.margins.left - template.margins.right
  const slices = useMemo(
    () => units.flatMap((unit) => expandUnitToSlices(unit, contentWidthMm)),
    [units, contentWidthMm],
  )
  const pages = useMemo(
    () => paginateSlices(slices, template, { get: (id) => heights[id] }, headerMm, footerMm),
    [slices, template, heights, headerMm, footerMm],
  )

  const zoomOut = () => setZoom((current) => Math.max(MIN_ZOOM, Math.round((current - ZOOM_STEP) * 10) / 10))
  const zoomIn = () => setZoom((current) => Math.min(MAX_ZOOM, Math.round((current + ZOOM_STEP) * 10) / 10))

  return (
    <div className="print-flow flex h-full flex-col">
      <div className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <SaveStatusBadge status={saveStatus} error={saveError} />
          {backupError && <span className="truncate text-xs text-red-600">{backupError}</span>}
          <p className="hidden text-sm font-medium text-slate-700 sm:block">
            {pages.length === 0 ? 'Preview kosong' : `${pages.length} halaman A4`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => void handleBackup()} disabled={backingUp} aria-label="Backup .LKPD">
            <DownloadIcon />
            {backingUp ? 'Menyiapkan…' : 'Backup .LKPD'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.print()} aria-label="Unduh PDF">
            <FileTextIcon />
            Unduh PDF
          </Button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <Button variant="secondary" size="sm" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Perkecil">
            −
          </Button>
          <span className="w-14 text-center text-sm text-slate-600">{Math.round(zoom * 100)}%</span>
          <Button variant="secondary" size="sm" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Perbesar">
            +
          </Button>
        </div>
      </div>

      {/* Container pengukuran tersembunyi: lebar = lebar konten A4, tidak ikut
          di-scale oleh zoom, sehingga hasil pagination konsisten di semua zoom. */}
      <div
        aria-hidden="true"
        className="no-print"
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: `${contentWidthMm}mm` }}>
          <MeasureNode id={HEADER_KEY} onHeight={reportHeight}>
            <PageHeader template={template} metadata={document.metadata} />
          </MeasureNode>
          {slices.map((slice) => (
            <MeasureNode key={sliceKey(slice)} id={sliceKey(slice)} onHeight={reportHeight}>
              <SliceView slice={slice} template={template} contentWidthMm={contentWidthMm} />
            </MeasureNode>
          ))}
          <MeasureNode id={FOOTER_KEY} onHeight={reportHeight}>
            <PageFooter template={template} metadata={document.metadata} pageNumber={1} />
          </MeasureNode>
        </div>
      </div>

      <div className="print-area flex-1 overflow-auto bg-slate-200 p-6">
        <div className="mx-auto space-y-6" style={{ width: `${template.pageWidth * zoom}mm` }}>
          {pages.map((pageSlices, index) => (
            <A4Page
              key={`${index}-${document.id}`}
              template={template}
              metadata={document.metadata}
              slices={pageSlices}
              pageNumber={index + 1}
              zoom={zoom}
            />
          ))}
          {pages.length === 0 && (
            <div className="no-print rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
              Tambahkan konten di panel kiri untuk melihat preview halaman A4.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
