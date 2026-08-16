export interface ParsedMultipleChoice {
  questionType: 'multiple_choice'
  text: string
  options: string[]
  answerSpaceLines: 0
}

export interface ParsedEssay {
  questionType: 'essay'
  text: string
  answerSpaceLines: number
}

export type ParsedQuestion = ParsedMultipleChoice | ParsedEssay

export interface ParseResult {
  questions: ParsedQuestion[]
  unrecognized: string[]
}

const DEFAULT_ESSAY_LINES = 5

// "1. ...", "1) ...", "Soal 1. ..."
const QUESTION_RE = /^(?:Soal\s+)?(\d{1,3})\s*[.)]\s*(.*)$/i

// "A. ...", "b) ..."
const OPTION_RE = /^([A-Za-z])\s*[.)]\s+(.+)$/

interface OpenQuestion {
  text: string
  options: string[]
  isMc: boolean
}

// Parser deterministik (tanpa AI) untuk format soal yang umum.
// Toleran terhadap: nomor dengan ".", ")", "Soal 1.", blank lines,
// multiple spaces, opsi A-E atau a-e.
export function parseQuestions(input: string): ParseResult {
  const questions: ParsedQuestion[] = []
  const unrecognized: string[] = []
  let current: OpenQuestion | null = null

  const flush = () => {
    if (!current) return
    const text = current.text.trim()
    const isMultipleChoice = current.isMc && current.options.length >= 2
    if (text) {
      if (isMultipleChoice) {
        questions.push({ questionType: 'multiple_choice', text, options: current.options, answerSpaceLines: 0 })
      } else {
        questions.push({ questionType: 'essay', text, answerSpaceLines: DEFAULT_ESSAY_LINES })
      }
    } else {
      unrecognized.push(...current.options.map((option) => `${option}`))
    }
    current = null
  }

  const lines = input.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim()
    if (!line) continue

    const questionMatch = line.match(QUESTION_RE)
    if (questionMatch) {
      flush()
      current = { text: questionMatch[2], options: [], isMc: false }
      continue
    }

    if (current) {
      const optionMatch = line.match(OPTION_RE)
      if (optionMatch) {
        current.isMc = true
        current.options.push(optionMatch[2].trim())
        continue
      }
    }

    if (current) {
      // Baris lanjutan dari teks soal.
      current.text = current.text ? `${current.text} ${line}` : line
    } else {
      // Tidak ada soal yang terbuka -> tidak dikenali.
      unrecognized.push(line)
    }
  }

  flush()

  return { questions, unrecognized }
}
