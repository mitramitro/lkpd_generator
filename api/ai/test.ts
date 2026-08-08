// Vercel Serverless Function: POST /api/ai/test
// Dibaca server-side; GEMINI_API_KEY dibaca dari environment Vercel, tidak
// pernah dikembalikan ke client. Struktur ini langsung dideploy ke Vercel
// tanpa konfigurasi tambahan.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAiTestRequest, MAX_BODY_BYTES } from '../../server/handler.js'
import { readRequestBody } from '../../server/requestBody.js'
import { createRateLimiter } from '../../server/rateLimit.js'

// Batas eksekusi Vercel (detik). Lebih longgar dari timeout Gemini (15s).
export const maxDuration = 30

// Rate limiting sederhana per instance (M5.1, bukan production-grade).
const RATE_MAX = 30
const RATE_WINDOW_MS = 60_000
const rateLimit = createRateLimiter(RATE_MAX, RATE_WINDOW_MS)

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function clientKey(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? 'unknown'
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { success: false, error: 'Method tidak diizinkan.' })
      return
    }

    const check = rateLimit(clientKey(req))
    if (!check.allowed) {
      res.setHeader('Retry-After', String(check.retryAfterSeconds))
      sendJson(res, 429, { success: false, error: 'Terlalu banyak permintaan. Coba lagi nanti.' })
      return
    }

    const body = await readRequestBody(req, MAX_BODY_BYTES)
    if (!body.ok) {
      const error = body.reason === 'too_large' ? 'Request body terlalu besar.' : 'Gagal membaca request body.'
      sendJson(res, 413, { success: false, error })
      return
    }

    const result = await handleAiTestRequest(body.body)
    sendJson(res, result.status, result.body)
  } catch (error) {
    console.error('[/api/ai/test] Error tak terduga:', error)
    sendJson(res, 500, { success: false, error: 'Terjadi kesalahan server.' })
  }
}
