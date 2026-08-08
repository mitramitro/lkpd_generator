// Konversi hasil AI (M5.2) menjadi block LKPD existing. Hanya data
// student-facing yang dipindahkan: text + options. answer/explanation adalah
// data transient milik guru (preview AI) dan TIDAK ikut ke QuestionBlock.
// number = 0; penomoran otomatis oleh store (renumberQuestions).
import type { Block, MaterialBlock, QuestionBlock } from '../models/lkpd'
import type { AiGeneratedQuestion } from '../types/ai'
import { newId } from './id'

const AI_ESSAY_LINES = 5

export function createQuestionBlockFromAi(question: AiGeneratedQuestion): QuestionBlock {
  if (question.type === 'multiple_choice') {
    return {
      id: newId(),
      type: 'question',
      number: 0,
      questionType: 'multiple_choice',
      text: question.text,
      options: question.options.map((option) => option.text),
    }
  }
  return {
    id: newId(),
    type: 'question',
    number: 0,
    questionType: 'essay',
    text: question.text,
    answerSpace: { lines: AI_ESSAY_LINES },
  }
}

// Ambil teks hanya dari MaterialBlock (judul + isi), gabung dengan separator
// yang jelas. Mengembalikan null bila LKPD tidak punya block Materi. Tidak
// mengirim gambar/whole document — hemat token dan aman untuk privacy.
export function extractMaterialText(blocks: Block[]): string | null {
  const materials = blocks.filter((block): block is MaterialBlock => block.type === 'material')
  if (materials.length === 0) return null
  return materials
    .map((material, index) => {
      const title = material.title.trim()
      const header = `[MATERI ${index + 1}]${title ? ` — ${title}` : ''}`
      return `${header}\n${material.content.trim()}`
    })
    .join('\n\n')
}
