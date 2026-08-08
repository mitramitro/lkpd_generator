// Handler inti endpoint POST /api/ai/generate-questions — dipakai oleh Vercel
// function dan middleware Vite dev (pola sama seperti server/handler.ts M5.1).
// Env di-inject sehingga bisa dites tanpa server/API key asli.
import {
  AI_FORMAT_ERROR,
  buildGenerateQuestionsSystemInstruction,
  buildGenerateQuestionsUserPrompt,
  GENERATE_QUESTIONS_SCHEMA,
  parseGeneratedQuestionsResponse,
  validateGenerateQuestionsRequest,
  type AiGeneratedQuestion,
} from './aiQuestions.js'
import { callGemini, readGeminiConfig, type CallGeminiOptions } from './gemini.js'

export interface AiGenerateQuestionsSuccessResponse {
  success: true
  questions: AiGeneratedQuestion[]
  count: number
}

export interface AiGenerateQuestionsErrorResponse {
  success: false
  error: string
}

export type AiGenerateQuestionsResponse = AiGenerateQuestionsSuccessResponse | AiGenerateQuestionsErrorResponse

export interface GenerateQuestionsHandlerResult {
  status: number
  body: AiGenerateQuestionsResponse
}

export interface GenerateQuestionsHandlerOptions extends CallGeminiOptions {
  env?: Record<string, string | undefined>
}

export const GENERATE_QUESTIONS_MAX_BODY_BYTES = 64 * 1024

export async function handleGenerateQuestionsRequest(
  rawBody: string | null,
  options: GenerateQuestionsHandlerOptions = {},
): Promise<GenerateQuestionsHandlerResult> {
  const env = options.env ?? process.env

  if (rawBody === null || rawBody.trim() === '') {
    return { status: 400, body: { success: false, error: 'Request body harus berupa JSON.' } }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return { status: 400, body: { success: false, error: 'Request body harus berupa JSON yang valid.' } }
  }

  const validation = validateGenerateQuestionsRequest(parsed)
  if (!validation.ok) {
    return { status: 400, body: { success: false, error: validation.error ?? 'Request tidak valid.' } }
  }

  const config = readGeminiConfig(env)
  if (!config.apiKey) {
    return { status: 500, body: { success: false, error: 'Gemini API key belum dikonfigurasi di server.' } }
  }

  const request = validation.request
  const result = await callGemini(buildGenerateQuestionsUserPrompt(request), config, {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    systemInstruction: buildGenerateQuestionsSystemInstruction(request),
    responseMimeType: 'application/json',
    responseSchema: GENERATE_QUESTIONS_SCHEMA,
    maxOutputTokens: 8192,
  })

  if (!result.ok) {
    return { status: 502, body: { success: false, error: result.userMessage } }
  }

  const questionsResult = parseGeneratedQuestionsResponse(result.text, request.count)
  if (!questionsResult.ok) {
    return { status: 502, body: { success: false, error: questionsResult.userMessage ?? AI_FORMAT_ERROR } }
  }

  return {
    status: 200,
    body: { success: true, questions: questionsResult.questions, count: questionsResult.questions.length },
  }
}
