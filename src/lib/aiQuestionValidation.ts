// Validasi soal hasil AI di sisi frontend (M5.2). Server sudah memvalidasi;
// lapisan ini adalah pertahanan terakhir sebelum soal dimasukkan ke document —
// soal invalid TIDAK BOLEH masuk LKPD. Pesan aman, tanpa detail teknis.
import type { AiGeneratedQuestion } from '../types/ai'

export type AiQuestionsValidationResult =
  | { ok: true; questions: AiGeneratedQuestion[] }
  | { ok: false; error: string }

const AI_FORMAT_ERROR = 'Hasil AI tidak sesuai format soal yang dibutuhkan.'
const MC_LABELS = ['A', 'B', 'C', 'D', 'E'] as const
const MC_LABEL_SET = new Set<string>(MC_LABELS)

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
    if (!Array.isArray(value.options) || value.options.length !== MC_LABELS.length) return false
    const seen = new Set<string>()
    for (const option of value.options) {
      if (!isRecord(option)) return false
      if (typeof option.label !== 'string' || !MC_LABEL_SET.has(option.label)) return false
      if (!isNonEmptyString(option.text)) return false
      const normalized = option.text.trim().toLowerCase()
      if (seen.has(normalized)) return false
      seen.add(normalized)
    }
    if (typeof value.answer !== 'string' || !MC_LABEL_SET.has(value.answer)) return false
    if (!isNonEmptyString(value.explanation)) return false
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
