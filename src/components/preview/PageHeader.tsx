import type { LKPDMetadata } from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'

export function PageHeader({ template, metadata }: { template: LKPDTemplate; metadata: LKPDMetadata }) {
  const header = template.components.header
  if (!header.enabled) return null

  const { typography } = template

  return (
    <div style={{ borderBottom: `1.5pt solid ${header.borderColor}`, paddingBottom: '2.5mm', marginBottom: '2mm' }}>
      <p
        style={{
          margin: 0,
          fontSize: `${typography.heading2Size}pt`,
          fontWeight: 700,
          lineHeight: 1.3,
          color: header.titleColor,
          overflowWrap: 'break-word',
        }}
      >
        {metadata.title || 'LKPD'}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '3mm',
          marginTop: '1mm',
          fontSize: `${typography.bodyFontSize - 1}pt`,
          color: header.subtitleColor,
        }}
      >
        <span style={{ minWidth: 0, overflowWrap: 'break-word' }}>
          {metadata.subject}
          {metadata.classLevel && ` • Kelas ${metadata.classLevel}`}
          {metadata.major && ` • ${metadata.major}`}
        </span>
        <span style={{ flexShrink: 0 }}>{metadata.schoolName}</span>
      </div>
    </div>
  )
}
