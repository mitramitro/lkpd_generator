// Vercel Serverless Function: POST /api/ai/generate-questions
// Pola sama seperti api/ai/test.ts (M5.1). Key dibaca server-side dari
// environment, tidak pernah dikembalikan ke client.
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  GENERATE_QUESTIONS_MAX_BODY_BYTES,
  handleGenerateQuestionsRequest,
} from '../../server/generateQuestionsHandler.js'
import { readRequestBody } from '../../server/requestBody.js'
import { createRateLimiter } from '../../server/rateLimit.js'

// Batas eksekusi Vercel (detik). Generate 20 soal + pembahasan butuh waktu.
export const maxDuration = 60

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

    const body = await readRequestBody(req, GENERATE_QUESTIONS_MAX_BODY_BYTES)
    if (!body.ok) {
      const error = body.reason === 'too_large' ? 'Request body terlalu besar.' : 'Gagal membaca request body.'
      sendJson(res, 413, { success: false, error })
      return
    }

    const result = await handleGenerateQuestionsRequest(body.body)
    sendJson(res, result.status, result.body)
  } catch (error) {
    console.error('[/api/ai/generate-questions] Error tak terduga:', error)
    sendJson(res, 500, { success: false, error: 'Terjadi kesalahan server.' })
  }
}
