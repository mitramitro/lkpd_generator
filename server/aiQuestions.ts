// M5.2 — AI Generate Soal (core server-side, pure, tanpa DOM/network).
// Validasi request, builder prompt, skema structured output Gemini, dan
// validasi ketat respons AI. Semua fungsi bisa dites tanpa server/network.
// Pola sama seperti server/aiCore.ts (M5.1).

export type AiRequestQuestionType = 'multiple_choice' | 'essay' | 'mixed'
export type AiDifficulty = 'easy' | 'medium' | 'hard'
export type AiQuestionType = 'multiple_choice' | 'essay'

export const MAX_SOURCE_LENGTH = 30_000
export const MIN_COUNT = 1
export const MAX_COUNT = 20
export const MAX_GRADE_LENGTH = 200
export const MAX_LANGUAGE_LENGTH = 50

export interface AiGenerateRequest {
  source: string
  questionType: AiRequestQuestionType
  count: number
  difficulty: AiDifficulty
  grade?: string
  language?: string
}

export interface AiOption {
  label: string
  text: string
}

export interface AiMultipleChoiceQuestion {
  type: 'multiple_choice'
  text: string
  options: AiOption[]
  answer: string
  explanation?: string
}

export interface AiEssayQuestion {
  type: 'essay'
  text: string
  answer?: string
  explanation?: string
}

export type AiGeneratedQuestion = AiMultipleChoiceQuestion | AiEssayQuestion

export type GenerateQuestionsValidation =
  | { ok: true; request: AiGenerateRequest }
  | { ok: false; error: string }

export type AiQuestionsParseResult =
  | { ok: true; questions: AiGeneratedQuestion[] }
  | { ok: false; userMessage: string }

export const AI_FORMAT_ERROR = 'Hasil AI tidak sesuai format soal yang dibutuhkan.'
export const AI_COUNT_ERROR = 'Hasil AI menghasilkan jumlah soal tidak sesuai permintaan. Coba lagi.'

const QUESTION_TYPES = new Set(['multiple_choice', 'essay', 'mixed'])
const DIFFICULTIES = new Set(['easy', 'medium', 'hard'])
const MC_LABELS = new Set(['A', 'B', 'C', 'D'])

const QUESTION_TYPE_LABELS: Record<AiRequestQuestionType, string> = {
  multiple_choice: 'pilihan ganda',
  essay: 'uraian',
  mixed: 'campuran pilihan ganda dan uraian dengan pembagian yang merata',
}

const DIFFICULTY_DESCRIPTIONS: Record<AiDifficulty, string> = {
  easy: 'recall dan konsep dasar yang sederhana',
  medium: 'pemahaman, aplikasi, dan konteks sederhana',
  hard: 'analisis, troubleshooting, dan studi kasus (HOTS bila relevan dengan materi)',
}

export function validateGenerateQuestionsRequest(body: unknown): GenerateQuestionsValidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body harus berupa JSON.' }
  }
  const record = body as Record<string, unknown>

  if (typeof record.source !== 'string') {
    return { ok: false, error: 'Materi/sumber wajib diisi.' }
  }
  const source = record.source.trim()
  if (!source) {
    return { ok: false, error: 'Materi/sumber tidak boleh kosong.' }
  }
  if (source.length > MAX_SOURCE_LENGTH) {
    return { ok: false, error: `Materi/sumber terlalu panjang (maksimal ${MAX_SOURCE_LENGTH} karakter).` }
  }

  if (typeof record.count !== 'number' || !Number.isInteger(record.count) || record.count < MIN_COUNT || record.count > MAX_COUNT) {
    return { ok: false, error: `Jumlah soal harus bilangan bulat antara ${MIN_COUNT} dan ${MAX_COUNT}.` }
  }

  if (typeof record.questionType !== 'string' || !QUESTION_TYPES.has(record.questionType)) {
    return { ok: false, error: 'Jenis soal tidak valid.' }
  }

  if (typeof record.difficulty !== 'string' || !DIFFICULTIES.has(record.difficulty)) {
    return { ok: false, error: 'Tingkat kesulitan tidak valid.' }
  }

  let grade: string | undefined
  if (record.grade !== undefined && record.grade !== null) {
    if (typeof record.grade !== 'string') return { ok: false, error: 'Kelas tidak valid.' }
    const trimmedGrade = record.grade.trim()
    if (trimmedGrade.length > MAX_GRADE_LENGTH) return { ok: false, error: 'Kelas terlalu panjang.' }
    grade = trimmedGrade || undefined
  }

  let language = 'id'
  if (record.language !== undefined && record.language !== null) {
    if (typeof record.language !== 'string') return { ok: false, error: 'Bahasa tidak valid.' }
    const trimmedLanguage = record.language.trim()
    if (!trimmedLanguage) return { ok: false, error: 'Bahasa tidak valid.' }
    if (trimmedLanguage.length > MAX_LANGUAGE_LENGTH) return { ok: false, error: 'Bahasa terlalu panjang.' }
    language = trimmedLanguage
  }

  return {
    ok: true,
    request: {
      source,
      questionType: record.questionType as AiRequestQuestionType,
      count: record.count,
      difficulty: record.difficulty as AiDifficulty,
      grade,
      language,
    },
  }
}

// System instruction: aturan membuat soal. Dipisah dari konten user supaya
// aturan tidak tercampur dengan materi (hemat token + konsisten).
export function buildGenerateQuestionsSystemInstruction(request: AiGenerateRequest): string {
  const lines = [
    'Kamu adalah guru SMK yang menyusun soal latihan Lembar Kerja Peserta Didik (LKPD) berdasarkan materi yang diberikan.',
    '',
    'Aturan wajib:',
    '- Gunakan materi yang diberikan sebagai sumber utama; jangan mengarang fakta yang tidak ada di materi.',
    '- Jangan menulis nomor soal — penomoran dibuat oleh aplikasi.',
    '- Jangan membuat HTML, markdown, tabel, atau layout — kembalikan hanya data soal.',
    '- Soal harus jelas dan tidak ambigu.',
    `- Jumlah soal HARUS TEPAT ${request.count}; jangan lebih atau kurang.`,
    `- Jenis soal: ${QUESTION_TYPE_LABELS[request.questionType]}.`,
    `- Tingkat kesulitan ${request.difficulty}: ${DIFFICULTY_DESCRIPTIONS[request.difficulty]}.`,
  ]
  if (request.grade) {
    lines.push(`- Sesuaikan vocabulary dan tingkat pengetahuan dengan kelas: ${request.grade}.`)
  } else {
    lines.push('- Tidak ada informasi kelas; jangan mengarang jenjang/jurusan tertentu.')
  }
  lines.push(
    '- Untuk soal pilihan ganda: tepat 4 opsi berlabel A, B, C, D; hanya satu jawaban benar; distractor harus masuk akal; field "answer" berisi huruf (A/B/C/D).',
    '- Untuk soal uraian: field "answer" berisi jawaban acuan atau rubrik sederhana.',
    '- Sertakan field "explanation" singkat sebagai pembahasan untuk guru.',
    `- Bahasa output: ${request.language}.`,
  )
  return lines.join('\n')
}

export function buildGenerateQuestionsUserPrompt(request: AiGenerateRequest): string {
  return [
    `Materi sumber:\n${request.source}`,
    '',
    `Buat TEPAT ${request.count} soal ${QUESTION_TYPE_LABELS[request.questionType]} berdasarkan materi di atas — tidak lebih, tidak kurang.`,
    'Kembalikan dalam bentuk JSON dengan kunci "questions".',
  ].join('\n')
}

// Skema structured output Gemini (generationConfig.responseSchema). Membatasi
// struktur respons sejak awal; validasi server tetap dilakukan terpisah.
export const GENERATE_QUESTIONS_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['multiple_choice', 'essay'] },
          text: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                label: { type: 'STRING' },
                text: { type: 'STRING' },
              },
              required: ['label', 'text'],
            },
            maxItems: 4,
          },
          answer: { type: 'STRING' },
          explanation: { type: 'STRING' },
        },
        required: ['type', 'text', 'answer', 'explanation'],
      },
    },
  },
  required: ['questions'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

// Validasi satu soal hasil AI. Seluruh response ditolak bila ada satu soal
// invalid — tidak boleh menyisipkan data setengah valid.
export function validateAiGeneratedQuestion(value: unknown): value is AiGeneratedQuestion {
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
    if (value.explanation !== undefined && typeof value.explanation !== 'string') return false
    return true
  }
  if (value.type === 'essay') {
    if (!isNonEmptyString(value.text)) return false
    if (value.answer !== undefined && typeof value.answer !== 'string') return false
    if (value.explanation !== undefined && typeof value.explanation !== 'string') return false
    return true
  }
  return false
}

export function validateAiQuestionsArray(value: unknown): AiQuestionsParseResult {
  if (!Array.isArray(value)) return { ok: false, userMessage: AI_FORMAT_ERROR }
  for (const item of value) {
    if (!validateAiGeneratedQuestion(item)) return { ok: false, userMessage: AI_FORMAT_ERROR }
  }
  return { ok: true, questions: value as AiGeneratedQuestion[] }
}

// Parse teks JSON yang dikembalikan Gemini (responseMimeType application/json)
// lalu validasi ketat: struktur + jumlah soal harus pas dengan permintaan.
export function parseGeneratedQuestionsResponse(text: string, expectedCount: number): AiQuestionsParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, userMessage: AI_FORMAT_ERROR }
  }
  if (!isRecord(parsed)) return { ok: false, userMessage: AI_FORMAT_ERROR }
  const validated = validateAiQuestionsArray(parsed.questions)
  if (!validated.ok) return validated
  if (validated.questions.length !== expectedCount) {
    return { ok: false, userMessage: AI_COUNT_ERROR }
  }
  return validated
}
