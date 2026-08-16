import type { LKPDMetadata } from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'
import { sliceKey, type PageSlice } from '../../lib/pagination'
import { SliceView } from './UnitView'
import { PageFooter } from './PageFooter'
import { PageHeader } from './PageHeader'

interface A4PageProps {
  template: LKPDTemplate
  metadata: LKPDMetadata
  slices: PageSlice[]
  pageNumber: number
  zoom: number
}

export function A4Page({ template, metadata, slices, pageNumber, zoom }: A4PageProps) {
  const contentWidthMm = template.pageWidth - template.margins.left - template.margins.right
  // Template bergambar memakai contentArea sebagai padding halaman; template
  // tanpa backgroundImage tetap memakai margins (perilaku lama tidak berubah).
  const pagePad = template.contentArea ?? template.margins

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
          padding: `${pagePad.top}mm ${pagePad.right}mm ${pagePad.bottom}mm ${pagePad.left}mm`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Latar dekoratif halaman (M5.3). Layer terpisah di bawah konten:
            tidak menjadi block, tidak ikut pagination, tidak menghalangi
            interaksi konten. */}
        {template.backgroundImage && (
          <div
            aria-hidden="true"
            className="a4-bg"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              backgroundImage: `url(${template.backgroundImage})`,
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
