// Validasi soal hasil AI di sisi frontend (M5.2). Server sudah memvalidasi;
// lapisan ini adalah pertahanan terakhir sebelum soal dimasukkan ke document —
// soal invalid TIDAK BOLEH masuk LKPD. Pesan aman, tanpa detail teknis.
import type { AiGeneratedQuestion } from '../types/ai'

export type AiQuestionsValidationResult =
  | { ok: true; questions: AiGeneratedQuestion[] }
  | { ok: false; error: string }

const AI_FORMAT_ERROR = 'Hasil AI tidak sesuai format soal yang dibutuhkan.'
const MC_LABELS = new Set(['A', 'B', 'C', 'D'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isValidAiGeneratedQuestion(value: unknown): value is AiGeneratedQuestion {
  if (!isRecord(value)) return false
  if (value.type === 'multiple_choice') {
    if (!isNonEmptyString(value.text)) return false
    if (!Array.isArray(value.options) || value.options.length !== 4) return false
    for (const option of value.options) {
      if (!isRecord(option)) return false
      if (typeof option.label !== 'string' || !MC_LABELS.has(option.label)) return false
      if (!isNonEmptyString(option.text)) return false
    }
    if (typeof value.answer !== 'string' || !MC_LABELS.has(value.answer)) return false
    return true
  }
  if (value.type === 'essay') {
    return isNonEmptyString(value.text)
  }
  return false
}

export function validateAiGeneratedQuestions(value: unknown): AiQuestionsValidationResult {
  if (!Array.isArray(value) || value.length === 0) return { ok: false, error: AI_FORMAT_ERROR }
  for (const item of value) {
    if (!isValidAiGeneratedQuestion(item)) return { ok: false, error: AI_FORMAT_ERROR }
  }
  return { ok: true, questions: value }
}
