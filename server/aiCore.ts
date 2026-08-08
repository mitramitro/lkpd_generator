// Validasi request AI (M5.1) — murni (pure), bisa dites tanpa server/network.
// Batas panjang prompt mencegah request tak terbatas.

export const MAX_PROMPT_LENGTH = 20000

export type PromptValidation =
  | { ok: true; prompt: string }
  | { ok: false; error: string }

export function validatePromptBody(body: unknown): PromptValidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body harus berupa JSON.' }
  }
  const prompt = (body as Record<string, unknown>).prompt
  if (typeof prompt !== 'string') {
    return { ok: false, error: 'Prompt harus berupa string.' }
  }
  const trimmed = prompt.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: 'Prompt tidak boleh kosong.' }
  }
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: `Prompt terlalu panjang (maksimal ${MAX_PROMPT_LENGTH} karakter).` }
  }
  return { ok: true, prompt: trimmed }
}
