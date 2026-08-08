// Proteksi sederhana per instance (M5.1). Ini BUKAN rate limiting production:
// state hanya di memori proses, jadi pada Vercel (multi-instance) masing-masing
// instance punya bucket sendiri. Untuk M5.1 cukup mencegah penyalahgunaan ringan.

export interface RateLimitDecision {
  allowed: boolean
  retryAfterSeconds: number
}

export type RateLimiter = (key: string) => RateLimitDecision

export interface RateLimitState {
  count: number
  resetAt: number
}

export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, RateLimitState>()
  return (key: string): RateLimitDecision => {
    const now = Date.now()
    const state = buckets.get(key)
    if (!state || state.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) }
    }
    state.count += 1
    if (state.count > maxRequests) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)) }
    }
    return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)) }
  }
}
