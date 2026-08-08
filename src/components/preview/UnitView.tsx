import type { PageSlice } from '../../lib/pagination'
import type { LKPDTemplate } from '../../models/template'
import { BlockRenderer } from './BlockRenderer'
import { GalleryRowView } from './GalleryRowView'
import { MaterialParagraphView } from './MaterialParagraphView'
import { QuestionAnswerView, QuestionTextView, QuestionUnitView } from './QuestionUnitView'

interface SliceViewProps {
  slice: PageSlice
  template: LKPDTemplate
  contentWidthMm: number
  continuation?: boolean
}

// Render satu slice pagination: bagian soal, baris galeri, paragraf materi,
// atau block tunggal. Q_text/q_answer dipakai saat galeri menempati posisi
// "below" sehingga urutan visual menjadi teks -> galeri -> opsi/jawaban.
export function SliceView({ slice, template, contentWidthMm, continuation = false }: SliceViewProps) {
  switch (slice.type) {
    case 'head':
      return (
        <QuestionUnitView
          question={slice.question}
          images={slice.images}
          sideGalleries={slice.sideGalleries}
          template={template}
        />
      )
    case 'q_text':
      return <QuestionTextView question={slice.question} images={slice.images} template={template} />
    case 'q_answer':
      return <QuestionAnswerView question={slice.question} template={template} />
    case 'gallery_row':
      return (
        <GalleryRowView
          gallery={slice.gallery}
          row={slice.row}
          columns={slice.columns}
          template={template}
          continuation={continuation}
        />
      )
    case 'material_para':
      return (
        <MaterialParagraphView
          material={slice.material}
          paragraph={slice.text}
          showTitle={slice.paraIndex === 0}
          template={template}
        />
      )
    case 'plain':
      return <BlockRenderer block={slice.block} template={template} contentWidthMm={contentWidthMm} />
  }
}
