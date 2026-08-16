import type {
  Block,
  EssayQuestion,
  HeadingBlock,
  ImageBlock,
  ImageGalleryBlock,
  LKPDDocument,
  LKPDMetadata,
  MaterialBlock,
  MultipleChoiceQuestion,
  PageBreakBlock,
  TextBlock,
} from '../models/lkpd'
import type { ParsedQuestion } from './questionParser'
import { newId } from './id'

export function createHeadingBlock(level: 1 | 2 | 3 = 2, text = ''): HeadingBlock {
  return { id: newId(), type: 'heading', level, text }
}

export function createTextBlock(text = ''): TextBlock {
  return { id: newId(), type: 'text', text }
}

export function createMultipleChoiceQuestion(): MultipleChoiceQuestion {
  return {
    id: newId(),
    type: 'question',
    number: 0,
    questionType: 'multiple_choice',
    text: '',
    options: ['', '', '', '', ''],
  }
}

export function createEssayQuestion(): EssayQuestion {
  return {
    id: newId(),
    type: 'question',
    number: 0,
    questionType: 'essay',
    text: '',
    answerSpace: { lines: 5 },
  }
}

export function createImageBlock(): ImageBlock {
  return { id: newId(), type: 'image', url: '', alt: '', caption: '', source: 'upload' }
}

export function createImageGalleryBlock(questionId = ''): ImageGalleryBlock {
  return {
    id: newId(),
    type: 'image_gallery',
    questionId,
    placement: 'below',
    layout: 'grid',
    columns: 3,
    gap: 'medium',
    width: 'medium',
    images: [],
  }
}

export function createMaterialBlock(title = '', content = ''): MaterialBlock {
  return { id: newId(), type: 'material', title, content }
}

export function createPageBreakBlock(): PageBreakBlock {
  return { id: newId(), type: 'page_break' }
}

// Konversi hasil parser menjadi structured question block.
// number = 0 karena penomoran otomatis di-renumber oleh store berdasarkan urutan block.
export function createQuestionBlockFromParsed(parsed: ParsedQuestion): MultipleChoiceQuestion | EssayQuestion {
  if (parsed.questionType === 'multiple_choice') {
    return {
      id: newId(),
      type: 'question',
      number: 0,
      questionType: 'multiple_choice',
      text: parsed.text,
      options: [...parsed.options],
    }
  }
  return {
    id: newId(),
    type: 'question',
    number: 0,
    questionType: 'essay',
    text: parsed.text,
    answerSpace: { lines: parsed.answerSpaceLines },
  }
}

export function createEmptyDocument(metadata: LKPDMetadata, templateId: string): LKPDDocument {
  const now = new Date().toISOString()
  return { id: newId(), metadata, templateId, blocks: [], createdAt: now, updatedAt: now }
}

export function renumberQuestions(blocks: Block[]): Block[] {
  let counter = 0
  return blocks.map((block) => {
    if (block.type === 'question') {
      counter += 1
      return { ...block, number: counter }
    }
    return block
  })
}
