import type {
  HeadingBlock,
  TextBlock,
  Block,
  QuestionBlock,
  ImageBlock,
  ImageGalleryBlock,
  MaterialBlock,
} from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'
import { optionLetter } from '../../lib/format'
import { resolveGalleryColumns, splitImagesIntoRows } from '../../lib/gallery'
import { imageFlowWidthPercent, resolveImageWidth } from '../../lib/imagePlacement'
import { useImageSource } from '../../hooks/useImageSource'
import { GalleryRowView } from './GalleryRowView'

interface BlockRendererProps {
  block: Block
  template: LKPDTemplate
  contentWidthMm: number
}

export function BlockRenderer({ block, template, contentWidthMm }: BlockRendererProps) {
  switch (block.type) {
    case 'heading':
      return <HeadingView block={block} template={template} />
    case 'text':
      return <TextView block={block} template={template} />
    case 'question':
      return <QuestionView block={block} template={template} />
    case 'image':
      return <ImageView block={block} template={template} />
    case 'material':
      return <MaterialView block={block} template={template} />
    case 'image_gallery':
      return <StandaloneGalleryView block={block} template={template} contentWidthMm={contentWidthMm} />
    case 'page_break':
      return null
  }
}

function HeadingView({ block, template }: { block: HeadingBlock; template: LKPDTemplate }) {
  const { typography, colors } = template
  const size =
    block.level === 1 ? typography.heading1Size : block.level === 2 ? typography.heading2Size : typography.heading3Size
  const isLevelOne = block.level === 1

  return (
    <div
      style={{
        fontFamily: typography.headingFontFamily,
        fontSize: `${size}pt`,
        lineHeight: typography.headingLineHeight,
        fontWeight: 700,
        color: colors.text,
        margin: isLevelOne ? '3mm 0 2.5mm' : '2.5mm 0 2mm',
        paddingLeft: isLevelOne ? '3mm' : 0,
        borderLeft: isLevelOne ? `1.5mm solid ${colors.primary}` : 'none',
        overflowWrap: 'break-word',
        minWidth: 0,
      }}
    >
      {block.text || '\u00A0'}
    </div>
  )
}

function TextView({ block, template }: { block: TextBlock; template: LKPDTemplate }) {
  return (
    <p
      style={{
        fontFamily: template.typography.fontFamily,
        fontSize: `${template.typography.bodyFontSize}pt`,
        lineHeight: template.typography.lineHeight,
        color: template.colors.text,
        margin: '0 0 3mm',
        whiteSpace: 'pre-line',
        overflowWrap: 'break-word',
      }}
    >
      {block.text || '\u00A0'}
    </p>
  )
}

function QuestionView({ block, template }: { block: QuestionBlock; template: LKPDTemplate }) {
  const { typography, colors } = template
  const style = template.components.question

  return (
    <div style={{ display: 'flex', gap: '2.5mm', marginBottom: '3mm' }}>
      {style.numberBadge ? (
        <span
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '6mm',
            height: '6mm',
            borderRadius: '3mm',
            background: style.numberBg || colors.primary,
            color: style.numberColor,
            fontSize: `${typography.bodyFontSize}pt`,
            fontWeight: 700,
            marginTop: '0.5mm',
          }}
        >
          {block.number}
        </span>
      ) : (
        <span
          style={{
            flexShrink: 0,
            fontWeight: 700,
            color: colors.primary,
            fontSize: `${typography.questionFontSize}pt`,
          }}
        >
          {block.number}.
        </span>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: `${typography.questionFontSize}pt`,
          lineHeight: typography.lineHeight,
          color: colors.text,
        }}
      >
        <p style={{ margin: 0, overflowWrap: 'break-word' }}>{block.text || '\u00A0'}</p>

        {block.questionType === 'multiple_choice' && (
          <div style={{ marginTop: '2mm', display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
            {block.options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '2mm', minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: colors.secondary, flexShrink: 0 }}>{optionLetter(index)}.</span>
                <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word' }}>{option || '\u00A0'}</span>
              </div>
            ))}
          </div>
        )}

        {block.questionType === 'essay' && (
          <div style={{ marginTop: '2mm' }}>
            {Array.from({ length: block.answerSpace.lines }).map((_, index) => (
              <div
                key={index}
                style={{ borderBottom: `0.5pt solid ${style.essayLineColor || colors.border}`, height: '7mm' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MaterialView({ block, template }: { block: MaterialBlock; template: LKPDTemplate }) {
  const { typography, colors } = template

  return (
    <div style={{ marginBottom: '3mm' }}>
      {block.title && (
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
          {block.title}
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
        {block.content || '\u00A0'}
      </p>
    </div>
  )
}

function StandaloneGalleryView({
  block,
  template,
  contentWidthMm,
}: {
  block: ImageGalleryBlock
  template: LKPDTemplate
  contentWidthMm: number
}) {
  const columns = resolveGalleryColumns(block, contentWidthMm)
  const rows = splitImagesIntoRows(block.images, columns)

  if (block.images.length === 0) {
    const { colors } = template
    return (
      <div
        style={{
          margin: '0 0 3mm',
          padding: '6mm',
          textAlign: 'center',
          border: `0.5pt dashed ${colors.border}`,
          borderRadius: '6px',
          color: colors.muted,
          fontSize: `${template.typography.bodyFontSize}pt`,
        }}
      >
        Galeri belum diisi — atur di panel editor.
      </div>
    )
  }

  return (
    <div>
      {rows.map((row) => (
        <GalleryRowView key={row.index} gallery={block} row={row} columns={columns} template={template} />
      ))}
    </div>
  )
}

function ImageView({ block, template }: { block: ImageBlock; template: LKPDTemplate }) {
  const { colors } = template
  const style = template.components.image
  const widthPercent = imageFlowWidthPercent(resolveImageWidth(block))
  const { src, loading } = useImageSource(block.url)

  if (!block.url) {
    return (
      <div
        style={{
          margin: '2mm 0 3mm',
          padding: '6mm',
          textAlign: 'center',
          border: `0.5pt dashed ${colors.border}`,
          borderRadius: `${style.radius}px`,
          color: colors.muted,
          fontSize: `${template.typography.bodyFontSize}pt`,
        }}
      >
        Gambar belum ditambahkan — atur di panel editor.
      </div>
    )
  }

  if (!src || loading) {
    return (
      <div
        style={{
          margin: '2mm 0 3mm',
          padding: '6mm',
          textAlign: 'center',
          border: `0.5pt dashed ${colors.border}`,
          borderRadius: `${style.radius}px`,
          color: colors.muted,
          fontSize: `${template.typography.bodyFontSize}pt`,
        }}
      >
        {loading ? 'Memuat gambar…' : 'Gambar tidak dapat dimuat.'}
      </div>
    )
  }

  return (
    <figure style={{ margin: '2mm 0 3mm', textAlign: 'center' }}>
      <img
        src={src}
        alt={block.alt}
        style={{
          maxWidth: `${widthPercent}%`,
          maxHeight: '120mm',
          borderRadius: `${style.radius}px`,
          border: style.borderColor ? `0.5pt solid ${style.borderColor}` : 'none',
          objectFit: 'contain',
        }}
      />
      {block.caption && (
        <figcaption
          style={{
            marginTop: '1mm',
            fontSize: `${template.typography.bodyFontSize - 2}pt`,
            color: colors.muted,
            fontStyle: 'italic',
            overflowWrap: 'break-word',
          }}
        >
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}
