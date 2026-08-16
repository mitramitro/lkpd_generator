import type { LKPDMetadata } from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'

interface PageFooterProps {
  template: LKPDTemplate
  metadata: LKPDMetadata
  pageNumber: number
}

export function PageFooter({ template, metadata, pageNumber }: PageFooterProps) {
  const footer = template.components.footer
  if (!footer.enabled) return null

  const { colors } = template

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '3mm',
        borderTop: `0.5pt solid ${colors.border}`,
        paddingTop: '2mm',
        fontSize: '8pt',
        color: footer.textColor,
      }}
    >
      <span style={{ minWidth: 0, overflowWrap: 'break-word' }}>
        {metadata.teacherName ? `Guru: ${metadata.teacherName}` : ''}
      </span>
      {footer.showPageNumber ? <span style={{ flexShrink: 0 }}>Halaman {pageNumber}</span> : <span />}
    </div>
  )
}
