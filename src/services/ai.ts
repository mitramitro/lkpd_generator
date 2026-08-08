// Service frontend untuk Gemini API. Semua request melewati server-side
// endpoint — browser TIDAK pernah memegang API key.
import type {
  AiGeneratedQuestion,
  AiGenerateQuestionsResponse,
  AiGenerateRequest,
  AiTestResponse,
} from '../types/ai'

export type GeminiTestResult = AiTestResponse

export interface TestGeminiOptions {
  url?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function parseResponse(data: unknown): AiTestResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    if (obj.success === true && typeof obj.text === 'string') {
      return { success: true, text: obj.text }
    }
    if (obj.success === false && typeof obj.error === 'string') {
      return { success: false, error: obj.error }
    }
  }
  return { success: false, error: 'Response tidak valid dari server.' }
}

export async function testGemini(prompt: string, options: TestGeminiOptions = {}): Promise<GeminiTestResult> {
  const url = options.url ?? '/api/ai/test'
  const timeoutMs = options.timeoutMs ?? 30_000
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })

    const data: unknown = await response.json().catch(() => null)
    const parsed = parseResponse(data)

    if (!response.ok) {
      return parsed
    }
    return parsed
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Request timeout. Coba lagi.' }
    }
    return { success: false, error: 'Gagal terhubung ke server. Pastikan aplikasi berjalan (npm run dev).' }
  } finally {
    clearTimeout(timer)
  }
}

// ---- M5.2: generate soal ----

export interface GenerateQuestionsOptions {
  url?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function parseQuestionsResponse(data: unknown): AiGenerateQuestionsResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    if (obj.success === true && Array.isArray(obj.questions)) {
      return {
        success: true,
        questions: obj.questions as AiGeneratedQuestion[],
        count: typeof obj.count === 'number' ? obj.count : obj.questions.length,
      }
    }
    if (obj.success === false && typeof obj.error === 'string') {
      return { success: false, error: obj.error }
    }
  }
  return { success: false, error: 'Response tidak valid dari server.' }
}

export async function generateQuestions(request: AiGenerateRequest, options: GenerateQuestionsOptions = {}): Promise<AiGenerateQuestionsResponse> {
  const url = options.url ?? '/api/ai/generate-questions'
  const timeoutMs = options.timeoutMs ?? 60_000
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    const data: unknown = await response.json().catch(() => null)
    return parseQuestionsResponse(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Request timeout. Coba lagi.' }
    }
    return { success: false, error: 'Gagal terhubung ke server. Pastikan aplikasi berjalan (npm run dev).' }
  } finally {
    clearTimeout(timer)
  }
}
