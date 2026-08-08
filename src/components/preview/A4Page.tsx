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
          width: `${template.pageWidth}mm`,
          height: `${template.pageHeight}mm`,
          boxSizing: 'border-box',
          background: template.colors.background,
          color: template.colors.text,
          fontFamily: template.typography.fontFamily,
          padding: `${template.margins.top}mm ${template.margins.right}mm ${template.margins.bottom}mm ${template.margins.left}mm`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
  )
}
