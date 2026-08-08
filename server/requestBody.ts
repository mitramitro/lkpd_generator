import type { IncomingMessage } from 'node:http'

export type ReadBodyResult =
  | { ok: true; body: string }
  | { ok: false; reason: 'too_large' | 'read_error' }

// Membaca body request sebagai teks dengan batas ukuran. Dipakai oleh adapter
// Vercel dan middleware Vite agar perilakunya sama di semua lingkungan.
export function readRequestBody(req: IncomingMessage, limit: number): Promise<ReadBodyResult> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let total = 0
    let settled = false
    const finish = (result: ReadBodyResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > limit) {
        finish({ ok: false, reason: 'too_large' })
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => finish({ ok: true, body: Buffer.concat(chunks).toString('utf8') }))
    req.on('error', () => finish({ ok: false, reason: 'read_error' }))
    req.on('aborted', () => finish({ ok: false, reason: 'read_error' }))
  })
}
