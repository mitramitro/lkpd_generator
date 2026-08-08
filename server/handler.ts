// Handler inti endpoint POST /api/ai/test — dipakai oleh Vercel function dan
// middleware Vite dev. Murni terhadap environment (env di-inject), sehingga
// bisa dites di Node tanpa server dan tanpa API key asli.
import { validatePromptBody } from './aiCore.js'
import { callGemini, readGeminiConfig, type CallGeminiOptions } from './gemini.js'

export interface AiSuccessResponse {
  success: true
  text: string
}

export interface AiErrorResponse {
  success: false
  error: string
}

export type AiTestResponse = AiSuccessResponse | AiErrorResponse

export interface HandlerResult {
  status: number
  body: AiTestResponse
}

export interface HandlerOptions extends CallGeminiOptions {
  env?: Record<string, string | undefined>
}

// Batas ukuran body request sebelum validasi JSON (mencegah body raksasa).
export const MAX_BODY_BYTES = 64 * 1024

// rawBody: null bila body tidak terbaca / terlalu besar.
export async function handleAiTestRequest(rawBody: string | null, options: HandlerOptions = {}): Promise<HandlerResult> {
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

  const validation = validatePromptBody(parsed)
  if (!validation.ok) {
    return { status: 400, body: { success: false, error: validation.error ?? 'Prompt tidak valid.' } }
  }

  const config = readGeminiConfig(env)
  if (!config.apiKey) {
    return { status: 500, body: { success: false, error: 'Gemini API key belum dikonfigurasi di server.' } }
  }

  const result = await callGemini(validation.prompt, config, options)
  if (!result.ok) {
    return { status: 502, body: { success: false, error: result.userMessage } }
  }
  return { status: 200, body: { success: true, text: result.text } }
}
