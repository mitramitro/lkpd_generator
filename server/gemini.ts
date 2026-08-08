// Klien minimal untuk Gemini API (Google AI for Developers / generativelanguage).
// Dipanggil HANYA dari server; API key dibaca dari environment dan tidak pernah
// diekspos ke browser. Model dikonfigurasi terpusat agar mudah diganti.

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

// Waktu tunggu panggilan Gemini (server-side). Client (browser) punya timeout
// sendiri yang lebih longgar.
export const DEFAULT_TIMEOUT_MS = 15000

export interface GeminiConfig {
  apiKey: string | null
  model: string
}

export function readGeminiConfig(env: Record<string, string | undefined>): GeminiConfig {
  const apiKey = env.GEMINI_API_KEY?.trim() || null
  const model = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
  return { apiKey, model }
}

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; userMessage: string }

export interface CallGeminiOptions {
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
  // M5.2: dukungan structured output. responseSchema dipakai bersama
  // responseMimeType 'application/json' untuk memaksa Gemini mengembalikan
  // JSON yang sesuai skema (bukan markdown). Server tetap melakukan validasi
  // terpisah karena hasil AI tidak boleh dipercaya 100%.
  systemInstruction?: string
  responseMimeType?: string
  responseSchema?: Record<string, unknown>
  maxOutputTokens?: number
}

// Menafsirkan respons JSON Gemini. Error JSON Gemini ({ error: { message } })
// dipetakan ke pesan yang aman untuk pengguna.
export function parseGeminiResponse(data: unknown): GeminiResult {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    if (obj.error) {
      const errObj = obj.error as Record<string, unknown>
      const message = typeof errObj.message === 'string' ? errObj.message.trim() : ''
      return { ok: false, userMessage: message || 'Gemini menolak request.' }
    }
    const candidates = obj.candidates
    if (Array.isArray(candidates) && candidates.length > 0) {
      const first = candidates[0] as Record<string, unknown> | undefined
      const content = first?.content as Record<string, unknown> | undefined
      const parts = content?.parts
      if (Array.isArray(parts) && parts.length > 0) {
        const text = (parts[0] as Record<string, unknown> | undefined)?.text
        if (typeof text === 'string' && text.trim().length > 0) {
          return { ok: true, text }
        }
      }
    }
    return { ok: false, userMessage: 'Response Gemini kosong.' }
  }
  return { ok: false, userMessage: 'Response Gemini tidak valid.' }
}

// Memanggil Gemini API dengan fetch (Node 22 punya fetch global). Error selalu
// dipetakan ke pesan aman; detail teknis hanya dicatat di console server.
export async function callGemini(
  prompt: string,
  config: GeminiConfig,
  options: CallGeminiOptions = {},
): Promise<GeminiResult> {
  if (!config.apiKey) {
    return { ok: false, userMessage: 'Gemini API key belum dikonfigurasi di server.' }
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const generationConfig: Record<string, unknown> = {
    temperature: 0.7,
    maxOutputTokens: options.maxOutputTokens ?? 1024,
  }
  if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType
  if (options.responseSchema) generationConfig.responseSchema = options.responseSchema

  const requestBody: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  }
  if (options.systemInstruction) {
    requestBody.systemInstruction = { parts: [{ text: options.systemInstruction }] }
  }

  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) {
      return { ok: false, userMessage: 'Request ke Gemini timeout. Coba lagi.' }
    }
    console.error('Gemini request gagal:', error instanceof Error ? error.message : String(error))
    return { ok: false, userMessage: 'Gagal terhubung ke Gemini API. Coba lagi.' }
  } finally {
    clearTimeout(timer)
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    // Hanya log pesan (bukan key, bukan stack trace lengkap).
    const parsed = parseGeminiResponse(data)
    if (!parsed.ok && parsed.userMessage) {
      console.error(`Gemini API HTTP ${response.status}:`, parsed.userMessage)
    }
    return { ok: false, userMessage: 'Gemini API mengembalikan error. Coba lagi.' }
  }

  return parseGeminiResponse(data)
}
