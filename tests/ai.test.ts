// Unit tests Milestone 5.1 (Gemini foundation: validation, handler, service).
// Dijalankan lewat scripts/run-tests.mjs (tsc -> CommonJS -> node).
// Tidak butuh API key nyata: semua panggilan Gemini di-stub lewat fetchImpl.
import { strict as assert } from 'node:assert'
import { MAX_PROMPT_LENGTH, validatePromptBody } from '../server/aiCore'
import { callGemini, parseGeminiResponse, readGeminiConfig } from '../server/gemini'
import { handleAiTestRequest } from '../server/handler'
import { createRateLimiter } from '../server/rateLimit'
import { testGemini } from '../src/services/ai'

const FAKE_KEY = 'FAKE-KEY-TIDAK-BOLEH-BOCOR-12345'

const tests: { name: string; fn: () => void | Promise<void> }[] = []
function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('1. prompt kosong ditolak', () => {
  const result = validatePromptBody({ prompt: '   ' })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'Prompt tidak boleh kosong.')
})

test('2. prompt terlalu panjang ditolak', () => {
  const result = validatePromptBody({ prompt: 'x'.repeat(MAX_PROMPT_LENGTH + 1) })
  assert.equal(result.ok, false)
  assert.match(result.error ?? '', /terlalu panjang/)
})

test('3. request valid diterima dan di-trim', () => {
  const result = validatePromptBody({ prompt: '  apa itu jaringan komputer  ' })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.prompt, 'apa itu jaringan komputer')
})

test('4. body bukan JSON / prompt bukan string ditolak', () => {
  assert.equal(validatePromptBody(null).ok, false)
  assert.equal(validatePromptBody('teks biasa').ok, false)
  assert.equal(validatePromptBody([]).ok, false)
  assert.equal(validatePromptBody({}).ok, false)
  assert.equal(validatePromptBody({ prompt: 42 }).ok, false)
  assert.equal(validatePromptBody({ prompt: true }).ok, false)
})

test('5. response success dapat diparse', () => {
  const result = parseGeminiResponse({
    candidates: [{ content: { parts: [{ text: 'Jaringan komputer adalah ...' }] } }],
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.text, 'Jaringan komputer adalah ...')
})

test('6. response error dapat diparse', () => {
  const result = parseGeminiResponse({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.userMessage, /API key/)
})

test('7. response kosong / tidak dikenal ditolak', () => {
  assert.equal(parseGeminiResponse({ candidates: [] }).ok, false)
  assert.equal(parseGeminiResponse({ candidates: [{ content: { parts: [] } }] }).ok, false)
  assert.equal(parseGeminiResponse({ foo: 'bar' }).ok, false)
  assert.equal(parseGeminiResponse(null).ok, false)
})

test('8. tanpa API key -> error jelas, key tidak pernah bocor', async () => {
  const result = await handleAiTestRequest(JSON.stringify({ prompt: 'halo' }), { env: {} })
  assert.equal(result.status, 500)
  assert.equal(result.body.success, false)
  if (!result.body.success) {
    assert.equal(result.body.error, 'Gemini API key belum dikonfigurasi di server.')
  }
  assert.ok(!JSON.stringify(result.body).includes('GEMINI_API_KEY'), 'env key name tidak boleh muncul')
})

test('9. request valid + stub fetch sukses -> 200 + text', async () => {
  const fetchImpl = async (): Promise<Response> =>
    jsonResponse({ candidates: [{ content: { parts: [{ text: 'jawaban aman' }] } }] })
  const result = await handleAiTestRequest(JSON.stringify({ prompt: 'jelaskan' }), {
    env: { GEMINI_API_KEY: FAKE_KEY },
    fetchImpl,
  })
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { success: true, text: 'jawaban aman' })
  assert.ok(!JSON.stringify(result.body).includes(FAKE_KEY), 'API key tidak boleh masuk response')
})

test('10. error Gemini -> 502 + pesan aman (bukan detail internal)', async () => {
  const fetchImpl = async (): Promise<Response> => jsonResponse({ error: { message: 'The API key in the request is invalid' } }, 400)
  const result = await handleAiTestRequest(JSON.stringify({ prompt: 'jelaskan' }), {
    env: { GEMINI_API_KEY: FAKE_KEY },
    fetchImpl,
  })
  assert.equal(result.status, 502)
  assert.equal(result.body.success, false)
  const text = JSON.stringify(result.body)
  assert.ok(!text.includes(FAKE_KEY), 'API key tidak boleh masuk response')
  assert.ok(!text.includes('invalid'), 'detail pesan Gemini tidak diekspos mentah')
})

test('11. JSON tidak valid -> 400', async () => {
  const result = await handleAiTestRequest('{invalid', { env: { GEMINI_API_KEY: FAKE_KEY } })
  assert.equal(result.status, 400)
  assert.equal(result.body.success, false)
})

test('12. body kosong / hanya spasi -> 400', async () => {
  assert.equal((await handleAiTestRequest(null, { env: {} })).status, 400)
  assert.equal((await handleAiTestRequest('', { env: {} })).status, 400)
  assert.equal((await handleAiTestRequest('   ', { env: {} })).status, 400)
})

test('13. frontend service mem-parse response success', async () => {
  const result = await testGemini('halo', {
    fetchImpl: async () => jsonResponse({ success: true, text: 'Halo dunia' }),
  })
  assert.deepEqual(result, { success: true, text: 'Halo dunia' })
})

test('14. frontend service menangani HTTP error (body error dipakai)', async () => {
  const result = await testGemini('halo', {
    fetchImpl: async () => jsonResponse({ success: false, error: 'Gemini API key belum dikonfigurasi di server.' }, 500),
  })
  assert.deepEqual(result, { success: false, error: 'Gemini API key belum dikonfigurasi di server.' })
})

test('15. frontend service menangani network error', async () => {
  const result = await testGemini('halo', {
    fetchImpl: async () => {
      throw new TypeError('fetch failed')
    },
  })
  assert.equal(result.success, false)
  if (!result.success) assert.match(result.error, /Gagal terhubung/)
})

test('16. frontend service menangani timeout (abort)', async () => {
  const result = await testGemini('halo', {
    fetchImpl: async () => {
      throw new DOMException('The operation was aborted.', 'AbortError')
    },
  })
  assert.equal(result.success, false)
  if (!result.success) assert.match(result.error, /timeout/i)
})

test('17. rate limiter sederhana memblokir setelah batas', () => {
  const limiter = createRateLimiter(3, 1000)
  const ip = '1.2.3.4'
  assert.equal(limiter(ip).allowed, true)
  assert.equal(limiter(ip).allowed, true)
  assert.equal(limiter(ip).allowed, true)
  const blocked = limiter(ip)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSeconds >= 1)
  assert.equal(limiter('5.6.7.8').allowed, true, 'IP lain tidak terpengaruh')
})

test('18. API key tidak pernah muncul di response manapun', async () => {
  const fetchImpl = async (): Promise<Response> => jsonResponse({ error: { message: 'bad key' } }, 401)
  const scenarios = [
    await handleAiTestRequest(JSON.stringify({ prompt: 'x' }), { env: {} }),
    await handleAiTestRequest(JSON.stringify({ prompt: 'x' }), { env: { GEMINI_API_KEY: FAKE_KEY }, fetchImpl }),
    await handleAiTestRequest('{}', { env: { GEMINI_API_KEY: FAKE_KEY }, fetchImpl }),
    await handleAiTestRequest(JSON.stringify({ prompt: 'x'.repeat(MAX_PROMPT_LENGTH + 1) }), {
      env: { GEMINI_API_KEY: FAKE_KEY },
      fetchImpl,
    }),
  ]
  for (const scenario of scenarios) {
    assert.ok(!JSON.stringify(scenario.body).includes(FAKE_KEY), 'response tidak boleh memuat API key')
  }
})

test('19. readGeminiConfig: key + model default / override', () => {
  const config = readGeminiConfig({ GEMINI_API_KEY: FAKE_KEY })
  assert.equal(config.apiKey, FAKE_KEY)
  assert.equal(config.model, 'gemini-flash-latest')
  const overridden = readGeminiConfig({ GEMINI_API_KEY: FAKE_KEY, GEMINI_MODEL: 'gemini-2.5-pro' })
  assert.equal(overridden.model, 'gemini-2.5-pro')
  assert.equal(readGeminiConfig({}).apiKey, null)
})

test('20. callGemini tanpa key mengembalikan pesan konfigurasi', async () => {
  const result = await callGemini('halo', { apiKey: null, model: 'gemini-2.5-flash' })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.userMessage, 'Gemini API key belum dikonfigurasi di server.')
})

let passed = 0
const failures: string[] = []

async function runAll(): Promise<void> {
  for (const entry of tests) {
    try {
      await entry.fn()
      passed += 1
      console.log(`  ok  ${entry.name}`)
    } catch (error) {
      failures.push(entry.name)
      console.error(`  FAIL ${entry.name}`)
      console.error(`       ${(error as Error).message}`)
    }
  }

  console.log(`\n${passed}/${tests.length} test passed`)
  if (failures.length > 0) {
    console.error(`\nFAILED: ${failures.join(', ')}`)
    process.exitCode = 1
  }
}

void runAll()
