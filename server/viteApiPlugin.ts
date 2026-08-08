// Middleware Vite dev: menangani POST /api/ai/test secara lokal agar
// `npm run dev` setara dengan Vercel Serverless Function. Vite hanya
// mengekspos env VITE_* ke browser; server middleware perlu loadEnv agar bisa
// membaca GEMINI_API_KEY dari .env.local.
import { loadEnv, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAiTestRequest, MAX_BODY_BYTES } from './handler.js'
import { readRequestBody } from './requestBody.js'
import { createRateLimiter } from './rateLimit.js'

const RATE_MAX = 30
const RATE_WINDOW_MS = 60_000

export function apiPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const rateLimit = createRateLimiter(RATE_MAX, RATE_WINDOW_MS)

  const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  }

  return {
    name: 'lkpd-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/ai/test', (req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { success: false, error: 'Method tidak diizinkan.' })
            return
          }

          const forwarded = req.headers['x-forwarded-for']
          const key = (typeof forwarded === 'string' && forwarded.trim()
            ? forwarded.split(',')[0].trim()
            : req.socket.remoteAddress) ?? 'dev'
          const check = rateLimit(key)
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

          const result = await handleAiTestRequest(body.body, { env })
          sendJson(res, result.status, result.body)
        })().catch((error: unknown) => {
          console.error('[/api/ai/test] Error tak terduga:', error)
          sendJson(res, 500, { success: false, error: 'Terjadi kesalahan server.' })
        })
      })
    },
  }
}
