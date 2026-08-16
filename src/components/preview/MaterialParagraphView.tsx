import type { MaterialBlock } from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'

interface MaterialParagraphViewProps {
  material: MaterialBlock
  paragraph: string
  showTitle: boolean
  template: LKPDTemplate
}

// Satu paragraf materi sebagai slice pagination. Judul hanya muncul pada
// paragraf pertama. whiteSpace pre-wrap mempertahankan baris baru dalam paragraf.
export function MaterialParagraphView({ material, paragraph, showTitle, template }: MaterialParagraphViewProps) {
  const { typography, colors } = template

  return (
    <div style={{ marginBottom: '3mm' }}>
      {showTitle && material.title && (
        <h2
          style={{
            fontFamily: typography.headingFontFamily,
            fontSize: `${typography.heading2Size}pt`,
            lineHeight: typography.headingLineHeight,
            fontWeight: 700,
            color: colors.text,
            borderLeft: `1.5mm solid ${colors.primary}`,
            paddingLeft: '3mm',
            margin: '0 0 2mm',
            overflowWrap: 'break-word',
          }}
        >
          {material.title}
        </h2>
      )}
      <p
        style={{
          fontFamily: typography.fontFamily,
          fontSize: `${typography.bodyFontSize}pt`,
          lineHeight: typography.lineHeight,
          color: colors.text,
          margin: 0,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
        }}
      >
        {paragraph || '\u00A0'}
      </p>
    </div>
  )
}
