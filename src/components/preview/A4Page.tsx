import type { LKPDMetadata } from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'
import { sliceKey, type PageSlice } from '../../lib/pagination'
import { contentWidthMmFor } from '../../lib/template'
import { makeImageReference } from '../../lib/imageStorage'
import { useImageSource } from '../../hooks/useImageSource'
import type { ResolvedPageBackground } from '../../lib/backgrounds'
import { SliceView } from './UnitView'
import { PageFooter } from './PageFooter'
import { PageHeader } from './PageHeader'

interface A4PageProps {
  template: LKPDTemplate
  metadata: LKPDMetadata
  slices: PageSlice[]
  pageNumber: number
  zoom: number
  // M5.3.1 — background halaman ini (sudah di-resolve oleh A4Preview).
  pageBackground: ResolvedPageBackground
}

export function A4Page({ template, metadata, slices, pageNumber, zoom, pageBackground }: A4PageProps) {
  // Lebar konten & padding halaman mengikuti safe area background halaman ini
  // (template / default dokumen / override per halaman).
  const { contentArea, builtinUrl, customImageId } = pageBackground
  const contentWidthMm = contentWidthMmFor(template.pageWidth, contentArea)

  // Background custom dimuat dari IndexedDB sebagai object URL (auto-revoke).
  const customBackground = useImageSource(customImageId ? makeImageReference(customImageId) : undefined)
  const backgroundUrl = customImageId ? customBackground.src : builtinUrl

  // Galeri dianggap lanjutan bila baris pertamanya memulai halaman ini dan
  // bagian soal-nya (teks/opsi) ada di halaman lain — atau galeri lepas.
  const questionIdsOnPage = new Set(
    slices
      .filter((slice) => slice.type === 'head' || slice.type === 'q_text' || slice.type === 'q_answer')
      .map((slice) => slice.questionId),
  )

  return (
    <div
      className="a4-scale"
      style={{ position: 'relative', width: `${template.pageWidth * zoom}mm`, height: `${template.pageHeight * zoom}mm`, overflow: 'hidden' }}
    >
      <div
        className="a4-page"
        style={{
          position: 'relative',
          width: `${template.pageWidth}mm`,
          height: `${template.pageHeight}mm`,
          boxSizing: 'border-box',
          background: template.colors.background,
          color: template.colors.text,
          fontFamily: template.typography.fontFamily,
          padding: `${contentArea.top}mm ${contentArea.right}mm ${contentArea.bottom}mm ${contentArea.left}mm`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Latar halaman (M5.3/M5.3.1): template, builtin, atau custom.
            Layer terpisah di bawah konten: bukan block, tidak ikut pagination,
            tidak menghalangi interaksi konten. */}
        {backgroundUrl && (
          <div
            aria-hidden="true"
            className="a4-bg"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <PageHeader template={template} metadata={metadata} />
          <div style={{ flex: 1, padding: '3mm 0', display: 'flex', flexDirection: 'column' }}>
            {slices.map((slice, index) => {
              const continuation = slice.type === 'gallery_row' && index === 0 && !questionIdsOnPage.has(slice.gallery.questionId)
              return (
                <SliceView
                  key={sliceKey(slice)}
                  slice={slice}
                  template={template}
                  contentWidthMm={contentWidthMm}
                  continuation={continuation}
                />
              )
            })}
          </div>
          <PageFooter template={template} metadata={metadata} pageNumber={pageNumber} />
        </div>
      </div>
    </div>
  )
}
