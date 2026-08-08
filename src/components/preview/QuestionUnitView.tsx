import { useEffect, useState, type ReactElement } from 'react'
import type { ImageBlock, ImageGalleryBlock, QuestionBlock } from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'
import { optionLetter } from '../../lib/format'
import { splitImagesIntoRows } from '../../lib/gallery'
import {
  imageColumnWidthPercent,
  imageFlowWidthPercent,
  resolveAutoPlacement,
  resolveImagePlacement,
  resolveImageWidth,
  type ImageSize,
  type ResolvedPlacement,
} from '../../lib/imagePlacement'
import { isImageReference } from '../../lib/imageStorage'
import { useImageSource } from '../../hooks/useImageSource'
import { GalleryRowView } from './GalleryRowView'

function useImageSize(url: string | undefined): ImageSize | null {
  const [size, setSize] = useState<ImageSize | null>(null)

  useEffect(() => {
    if (!url) {
      setSize(null)
      return
    }
    let active = true
    const image = new Image()
    image.onload = () => {
      if (active) setSize({ w: image.naturalWidth, h: image.naturalHeight })
    }
    image.src = url
    return () => {
      active = false
      image.onload = null
    }
  }, [url])

  return size
}

interface QuestionImageProps {
  block: ImageBlock
  template: LKPDTemplate
  widthPercent: number
  centered?: boolean
  inline?: boolean
}

function QuestionImage({ block, template, widthPercent, centered = false, inline = false }: QuestionImageProps) {
  const { colors } = template
  const style = template.components.image
  const { src, loading } = useImageSource(block.url)

  if (!block.url) {
    return (
      <div
        style={{
          margin: '0 0 2mm',
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
    const text = loading ? 'Memuat gambar…' : 'Gambar tidak dapat dimuat.'
    return (
      <div
        style={{
          margin: '0 0 2mm',
          padding: '6mm',
          textAlign: 'center',
          border: `0.5pt dashed ${colors.border}`,
          borderRadius: `${style.radius}px`,
          color: colors.muted,
          fontSize: `${template.typography.bodyFontSize}pt`,
        }}
      >
        {text}
      </div>
    )
  }

  const image = (
    <img
      src={src}
      alt={block.alt}
      decoding="async"
      style={{
        maxWidth: `${widthPercent}%`,
        maxHeight: '120mm',
        borderRadius: `${style.radius}px`,
        border: style.borderColor ? `0.5pt solid ${style.borderColor}` : 'none',
        objectFit: 'contain',
        display: inline ? 'inline-block' : 'block',
        verticalAlign: inline ? 'middle' : 'top',
      }}
    />
  )

  const caption = block.caption && (
    <span
      style={{
        display: 'block',
        marginTop: '1mm',
        fontSize: `${template.typography.bodyFontSize - 2}pt`,
        color: colors.muted,
        fontStyle: 'italic',
      }}
    >
      {block.caption}
    </span>
  )

  if (inline) {
    return (
      <span style={{ display: 'inline-block', margin: '0 1mm 2mm 0', verticalAlign: 'top', textAlign: 'center' }}>
        {image}
        {caption}
      </span>
    )
  }

  return (
    <figure style={{ margin: '0 0 2mm', textAlign: centered ? 'center' : 'left' }}>
      {image}
      {caption}
    </figure>
  )
}

function QuestionNumber({ question, template }: { question: QuestionBlock; template: LKPDTemplate }) {
  const { typography, colors } = template
  const style = template.components.question

  if (style.numberBadge) {
    return (
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
        {question.number}
      </span>
    )
  }

  return (
    <span
      style={{
        flexShrink: 0,
        fontWeight: 700,
        color: colors.primary,
        fontSize: `${typography.questionFontSize}pt`,
      }}
    >
      {question.number}.
    </span>
  )
}

function QuestionChoices({ question, template }: { question: QuestionBlock; template: LKPDTemplate }) {
  const { colors } = template
  const style = template.components.question

  if (question.questionType === 'multiple_choice') {
    return (
      <div style={{ marginTop: '2mm', display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
        {question.options.map((option, index) => (
          <div key={index} style={{ display: 'flex', gap: '2mm' }}>
            <span style={{ fontWeight: 600, color: colors.secondary }}>{optionLetter(index)}.</span>
            <span style={{ flex: 1 }}>{option || '\u00A0'}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '2mm' }}>
      {Array.from({ length: question.answerSpace.lines }).map((_, index) => (
        <div key={index} style={{ borderBottom: `0.5pt solid ${style.essayLineColor || colors.border}`, height: '7mm' }} />
      ))}
    </div>
  )
}

function QuestionTextContent({ question }: { question: QuestionBlock }) {
  return <p style={{ margin: 0 }}>{question.text || '\u00A0'}</p>
}

interface QuestionPartProps {
  question: QuestionBlock
  images?: ImageBlock[]
  template: LKPDTemplate
}

// Bagian SOAL (nomor + teks + gambar terkait) dari sebuah unit question.
// Dipakai saat media (galeri) menempati posisi "below": urutan visual menjadi
// nomor+teks, lalu media, lalu opsi/jawaban.
export function QuestionTextView({ question, images = [], template }: QuestionPartProps) {
  const aboveImages = images.filter((image) => resolveImagePlacement(image) === 'above')
  const flowImages = images.filter((image) => resolveImagePlacement(image) !== 'above')

  const renderImages = (list: ImageBlock[]) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {list.map((image) => (
        <QuestionImage
          key={image.id}
          block={image}
          template={template}
          widthPercent={imageFlowWidthPercent(resolveImageWidth(image))}
        />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: '2.5mm', marginBottom: '3mm' }}>
      <QuestionNumber question={question} template={template} />
      <div style={{ flex: 1, minWidth: 0, fontSize: `${template.typography.questionFontSize}pt`, lineHeight: template.typography.lineHeight, color: template.colors.text }}>
        {aboveImages.length > 0 && renderImages(aboveImages)}
        <QuestionTextContent question={question} />
        {flowImages.length > 0 && renderImages(flowImages)}
      </div>
    </div>
  )
}

// Bagian JAWABAN (opsi / baris jawaban) dari sebuah unit question, tanpa nomor.
export function QuestionAnswerView({ question, template }: QuestionPartProps) {
  const { typography, colors } = template
  return (
    <div
      style={{
        fontSize: `${typography.questionFontSize}pt`,
        lineHeight: typography.lineHeight,
        color: colors.text,
        marginBottom: '3mm',
      }}
    >
      <QuestionChoices question={question} template={template} />
    </div>
  )
}

interface QuestionUnitViewProps {
  question: QuestionBlock
  images: ImageBlock[]
  sideGalleries?: ImageGalleryBlock[]
  template: LKPDTemplate
}

// Menampilkan soal + gambar terkait sebagai SATU unit (head slice). Nomor soal
// berada di gutter/kolom nomor, gambar masuk ke dalam content area soal sesuai
// placement semantic:
//   above   : gambar di atas teks soal
//   below   : teks soal, lalu gambar, lalu opsi/jawaban
//   center  : teks soal, lalu gambar di tengah, lalu opsi/jawaban
//   left/right: dua kolom (gambar di sisi), nomor tetap di gutter
//   inline  : gambar kecil dalam aliran teks
export function QuestionUnitView({ question, images, sideGalleries = [], template }: QuestionUnitViewProps) {
  const firstImageSource = useImageSource(images[0]?.url)
  const size = useImageSize(isImageReference(images[0]?.url) ? firstImageSource.src : images[0]?.url)

  const answerLines = question.questionType === 'essay' ? question.answerSpace.lines : question.options.length
  const rawPlacement = images.length > 0 ? resolveImagePlacement(images[0]) : 'auto'
  const placement: ResolvedPlacement =
    rawPlacement === 'auto' ? resolveAutoPlacement(images, size, answerLines) : rawPlacement

  const textElement = <QuestionTextContent question={question} />
  const choicesElement = <QuestionChoices question={question} template={template} />

  const textAndChoices = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {textElement}
      {choicesElement}
    </div>
  )

  const flowImages = (centered: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {images.map((image) => (
        <QuestionImage
          key={image.id}
          block={image}
          template={template}
          widthPercent={imageFlowWidthPercent(resolveImageWidth(image))}
          centered={centered}
        />
      ))}
    </div>
  )

  const inlineImages = (
    <div style={{ marginBottom: '2mm' }}>
      {images.map((image) => (
        <QuestionImage
          key={image.id}
          block={image}
          template={template}
          widthPercent={imageFlowWidthPercent(resolveImageWidth(image))}
          inline
        />
      ))}
    </div>
  )

  const sideImages =
    images.length > 0 && (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2mm',
          width: `${imageColumnWidthPercent(resolveImageWidth(images[0]))}%`,
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        {images.map((image) => (
          <QuestionImage key={image.id} block={image} template={template} widthPercent={100} />
        ))}
      </div>
    )

  // Kolom galeri untuk placement left/right: semua baris ditumpuk vertikal
  // (1 kolom) agar muat sebagai kolom samping. Hanya dibuat saat ada galeri.
  const hasSideGallery = sideGalleries.length > 0
  const sideGalleryWidth = hasSideGallery ? sideGalleries[0].width ?? 'medium' : 'medium'
  const sideGalleryColumn = hasSideGallery && (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2mm',
        width: `${imageColumnWidthPercent(sideGalleryWidth)}%`,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      {sideGalleries.flatMap((gallery) => {
        const rows = splitImagesIntoRows(gallery.images, 1)
        return rows.map((row) => (
          <GalleryRowView key={`${gallery.id}-${row.index}`} gallery={gallery} row={row} columns={1} template={template} />
        ))
      })}
    </div>
  )

  let content: ReactElement
  if (images.length === 0 && !hasSideGallery) {
    content = textAndChoices
  } else {
    switch (placement) {
      case 'above':
        content = (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {flowImages(false)}
            {textAndChoices}
          </div>
        )
        break
      case 'below':
        content = (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {textElement}
            {flowImages(false)}
            {choicesElement}
          </div>
        )
        break
      case 'center':
        content = (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {textElement}
            {flowImages(true)}
            {choicesElement}
          </div>
        )
        break
      case 'left':
        content = (
          <div style={{ display: 'flex', gap: '3mm', alignItems: 'flex-start' }}>
            {hasSideGallery ? sideGalleryColumn : sideImages}
            {textAndChoices}
          </div>
        )
        break
      case 'right':
        content = (
          <div style={{ display: 'flex', gap: '3mm', alignItems: 'flex-start' }}>
            {textAndChoices}
            {hasSideGallery ? sideGalleryColumn : sideImages}
          </div>
        )
        break
      case 'inline':
        content = (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {textElement}
            {inlineImages}
            {choicesElement}
          </div>
        )
        break
    }
  }

  return (
    <div style={{ display: 'flex', gap: '2.5mm', marginBottom: '3mm' }}>
      <QuestionNumber question={question} template={template} />
      <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
    </div>
  )
}
