// Unit tests Milestone 5.2 (AI Generate Soal).
// Dijalankan lewat scripts/run-tests.mjs (tsc -> CommonJS -> node).
// Tidak butuh API key nyata: semua panggilan Gemini di-stub lewat fetchImpl.
import { strict as assert } from 'node:assert'
import {
  AI_FORMAT_ERROR,
  buildGenerateQuestionsSystemInstruction,
  buildGenerateQuestionsUserPrompt,
  MAX_COUNT,
  MAX_SOURCE_LENGTH,
  parseGeneratedQuestionsResponse,
  validateAiGeneratedQuestion,
  validateAiQuestionsArray,
  validateGenerateQuestionsRequest,
} from '../server/aiQuestions'
import { handleGenerateQuestionsRequest } from '../server/generateQuestionsHandler'
import { createQuestionBlockFromAi, extractMaterialText } from '../src/lib/aiQuestionFactory'
import { validateAiGeneratedQuestions } from '../src/lib/aiQuestionValidation'
import { allSelected, countSelected, initialSelection, setAll, toggleAt } from '../src/lib/aiQuestionSelection'
import { renumberQuestions } from '../src/lib/factories'
import { generateQuestions } from '../src/services/ai'
import type { Block, MultipleChoiceQuestion, EssayQuestion } from '../src/models/lkpd'
import type { AiGeneratedQuestion } from '../src/types/ai'

const FAKE_KEY = 'FAKE-KEY-TIDAK-BOLEH-BOCOR-12345'

const validMc: AiGeneratedQuestion = {
  type: 'multiple_choice',
  text: 'Apa fungsi utama switch?',
  options: [
    { label: 'A', text: 'Menghubungkan banyak perangkat dalam jaringan' },
    { label: 'B', text: 'Menyimpan data' },
    { label: 'C', text: 'Mencetak dokumen' },
    { label: 'D', text: 'Menyediakan internet tanpa kabel' },
  ],
  answer: 'A',
  explanation: 'Switch menghubungkan banyak perangkat dalam satu jaringan.',
}
const validEssay: AiGeneratedQuestion = { type: 'essay', text: 'Jelaskan perbedaan router dan switch.', answer: 'Router menghubungkan jaringan yang berbeda; switch menghubungkan perangkat dalam satu jaringan.', explanation: 'Rubrik: sebutkan peran masing-masing.' }

const tests: { name: string; fn: () => void | Promise<void> }[] = []
function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function geminiJsonResponse(questions: unknown, status = 200): Response {
  return jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] } }] }, status)
}

function validRequest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ source: 'Materi jaringan komputer', count: 2, questionType: 'mixed', difficulty: 'medium', ...overrides })
}

// ---- A. Request validation ----

test('1. source kosong ditolak', () => {
  assert.equal(validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), source: '   ' }).ok, false)
  assert.equal(validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), source: '' }).ok, false)
})

test('2. source bukan string ditolak', () => {
  assert.equal(validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), source: 42 }).ok, false)
  assert.equal(validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), source: null }).ok, false)
  assert.equal(validateGenerateQuestionsRequest(null).ok, false)
})

test('3. source terlalu panjang ditolak', () => {
  const result = validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), source: 'x'.repeat(MAX_SOURCE_LENGTH + 1) })
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.error, /terlalu panjang/)
})

test('4. count di luar rentang / bukan integer ditolak', () => {
  for (const count of [0, -1, MAX_COUNT + 1, 1.5, '10', null, undefined]) {
    const result = validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), count })
    assert.equal(result.ok, false, `count=${String(count)} harus ditolak`)
  }
})

test('5. questionType tidak valid ditolak', () => {
  for (const questionType of ['pg', 'multiplechoice', 42, '']) {
    const result = validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), questionType })
    assert.equal(result.ok, false, `questionType=${String(questionType)} harus ditolak`)
  }
})

test('6. difficulty tidak valid ditolak', () => {
  for (const difficulty of ['mudah', 'hardcore', 42, '']) {
    const result = validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), difficulty })
    assert.equal(result.ok, false, `difficulty=${String(difficulty)} harus ditolak`)
  }
})

test('7. request valid diterima + di-trim + default bahasa id', () => {
  const result = validateGenerateQuestionsRequest({ source: '  materi  ', count: 5, questionType: 'multiple_choice', difficulty: 'easy' })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.request.source, 'materi')
    assert.equal(result.request.count, 5)
    assert.equal(result.request.questionType, 'multiple_choice')
    assert.equal(result.request.difficulty, 'easy')
    assert.equal(result.request.language, 'id')
    assert.equal(result.request.grade, undefined)
  }
})

test('8. grade optional dan dibatasi panjang', () => {
  const ok = validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), grade: 'X TKJ' })
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.request.grade, 'X TKJ')
  const tooLong = validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), grade: 'x'.repeat(201) })
  assert.equal(tooLong.ok, false)
  assert.equal(validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), grade: '   ' }).ok, true)
})

test('9. language invalid / terlalu panjang ditolak', () => {
  assert.equal(validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), language: '' }).ok, false)
  assert.equal(validateGenerateQuestionsRequest({ ...JSON.parse(validRequest()), language: 'x'.repeat(51) }).ok, false)
})

// ---- B. AI response validation ----

test('10. response MC valid diterima', () => {
  const result = parseGeneratedQuestionsResponse(JSON.stringify({ questions: [validMc] }), 1)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.questions[0].type, 'multiple_choice')
})

test('11. response essay valid diterima', () => {
  const result = parseGeneratedQuestionsResponse(JSON.stringify({ questions: [validEssay] }), 1)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.questions[0].type, 'essay')
})

test('12. response mixed (MC + essay) valid diterima', () => {
  const result = parseGeneratedQuestionsResponse(JSON.stringify({ questions: [validMc, validEssay] }), 2)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.questions.length, 2)
})

test('13. MC kurang dari 4 opsi ditolak', () => {
  const bad = { ...validMc, options: validMc.options.slice(0, 3) }
  assert.equal(validateAiGeneratedQuestion(bad), false)
  assert.equal(validateAiQuestionsArray([bad]).ok, false)
})

test('14. MC lebih dari 4 opsi ditolak', () => {
  const bad = { ...validMc, options: [...validMc.options, { label: 'E', text: 'opsi ekstra' }] }
  assert.equal(validateAiGeneratedQuestion(bad), false)
})

test('15. answer bukan A/B/C/D ditolak', () => {
  assert.equal(validateAiGeneratedQuestion({ ...validMc, answer: 'E' }), false)
  assert.equal(validateAiGeneratedQuestion({ ...validMc, answer: '' }), false)
})

test('16. teks soal kosong ditolak', () => {
  assert.equal(validateAiGeneratedQuestion({ ...validMc, text: '   ' }), false)
  assert.equal(validateAiGeneratedQuestion({ ...validEssay, text: '' }), false)
})

test('17. type tidak dikenal ditolak', () => {
  assert.equal(validateAiGeneratedQuestion({ ...validMc, type: 'drag_drop' }), false)
  assert.equal(validateAiGeneratedQuestion(null), false)
  assert.equal(validateAiGeneratedQuestion('bukan object'), false)
})

test('18. response bukan JSON / bukan object dengan kunci questions ditolak', () => {
  const notJson = parseGeneratedQuestionsResponse('tidak json', 1)
  assert.equal(notJson.ok, false)
  if (!notJson.ok) assert.equal(notJson.userMessage, AI_FORMAT_ERROR)
  const noKey = parseGeneratedQuestionsResponse(JSON.stringify({ foo: [] }), 1)
  assert.equal(noKey.ok, false)
  const notArray = parseGeneratedQuestionsResponse(JSON.stringify({ questions: 'x' }), 1)
  assert.equal(notArray.ok, false)
})

test('19. jumlah soal tidak sesuai permintaan ditolak (bukan crash)', () => {
  const result = parseGeneratedQuestionsResponse(JSON.stringify({ questions: [validMc, validEssay] }), 3)
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.userMessage, /jumlah soal/)
})

// ---- C. Conversion ----

test('20. AI MC -> QuestionBlock: answer/explanation TIDAK ikut', () => {
  const block = createQuestionBlockFromAi(validMc) as MultipleChoiceQuestion
  assert.equal(block.type, 'question')
  assert.equal(block.questionType, 'multiple_choice')
  assert.equal(block.number, 0)
  assert.equal(block.text, validMc.text)
  assert.deepEqual(block.options, validMc.options.map((option) => option.text))
  assert.ok(!('answer' in block), 'answer tidak boleh masuk student-facing block')
  assert.ok(!('explanation' in block), 'explanation tidak boleh masuk student-facing block')
})

test('21. AI essay -> QuestionBlock: answer/explanation TIDAK ikut', () => {
  const block = createQuestionBlockFromAi(validEssay) as EssayQuestion
  assert.equal(block.questionType, 'essay')
  assert.equal(block.number, 0)
  assert.equal(block.text, validEssay.text)
  assert.equal(block.answerSpace.lines, 5)
  assert.ok(!('answer' in block), 'answer tidak boleh masuk student-facing block')
  assert.ok(!('explanation' in block), 'explanation tidak boleh masuk student-facing block')
})

test('22. renumberQuestions memberi nomor berurutan', () => {
  const blocks: Block[] = [createQuestionBlockFromAi(validMc), createQuestionBlockFromAi(validEssay)]
  const renumbered = renumberQuestions(blocks)
  assert.equal(renumbered[0].type === 'question' && renumbered[0].number, 1)
  assert.equal(renumbered[1].type === 'question' && renumbered[1].number, 2)
})

test('23. extractMaterialText: gabung MaterialBlock + separator; tanpa material -> null', () => {
  const blocks: Block[] = [
    { id: 'q1', type: 'question', number: 1, questionType: 'multiple_choice', text: 'x', options: ['a', 'b', 'c', 'd'] },
    { id: 'm1', type: 'material', title: 'Jaringan Dasar', content: 'Switch adalah...' },
    { id: 'm2', type: 'material', title: '', content: 'Router adalah...' },
  ]
  const text = extractMaterialText(blocks)
  assert.ok(text)
  if (text) {
    assert.match(text, /\[MATERI 1\] — Jaringan Dasar/)
    assert.match(text, /\[MATERI 2\]/)
    assert.match(text, /Switch adalah/)
    assert.match(text, /Router adalah/)
  }
  assert.equal(extractMaterialText([{ id: 'q1', type: 'question', number: 1, questionType: 'essay', text: 'x', answerSpace: { lines: 5 } }]), null)
})

// ---- D. Handler ----

test('24. tanpa API key -> 500 aman, key tidak bocor', async () => {
  const result = await handleGenerateQuestionsRequest(validRequest(), { env: {} })
  assert.equal(result.status, 500)
  assert.equal(result.body.success, false)
  if (!result.body.success) assert.equal(result.body.error, 'Gemini API key belum dikonfigurasi di server.')
  assert.ok(!JSON.stringify(result.body).includes('GEMINI_API_KEY'))
})

test('25. request valid + stub fetch sukses -> 200 + questions', async () => {
  const fetchImpl = async (): Promise<Response> => geminiJsonResponse([validMc, validEssay])
  const result = await handleGenerateQuestionsRequest(validRequest(), { env: { GEMINI_API_KEY: FAKE_KEY }, fetchImpl })
  assert.equal(result.status, 200)
  assert.equal(result.body.success, true)
  if (result.body.success) {
    assert.equal(result.body.count, 2)
    assert.equal(result.body.questions.length, 2)
  }
  assert.ok(!JSON.stringify(result.body).includes(FAKE_KEY), 'API key tidak boleh masuk response')
})

test('26. error Gemini -> 502 + pesan aman', async () => {
  const fetchImpl = async (): Promise<Response> => jsonResponse({ error: { message: 'The API key in the request is invalid' } }, 400)
  const result = await handleGenerateQuestionsRequest(validRequest(), { env: { GEMINI_API_KEY: FAKE_KEY }, fetchImpl })
  assert.equal(result.status, 502)
  const text = JSON.stringify(result.body)
  assert.ok(!text.includes(FAKE_KEY))
  assert.ok(!text.includes('invalid'), 'detail pesan Gemini tidak diekspos mentah')
})

test('27. text response bukan JSON -> 502 format error', async () => {
  const fetchImpl = async (): Promise<Response> => geminiJsonResponse('ini bukan json')
  const result = await handleGenerateQuestionsRequest(validRequest(), { env: { GEMINI_API_KEY: FAKE_KEY }, fetchImpl })
  assert.equal(result.status, 502)
  assert.equal(result.body.success, false)
  if (!result.body.success) assert.equal(result.body.error, AI_FORMAT_ERROR)
})

test('28. jumlah soal dari AI tidak sesuai -> 502, tidak disisipkan sebagian', async () => {
  const fetchImpl = async (): Promise<Response> => geminiJsonResponse([validMc])
  const result = await handleGenerateQuestionsRequest(validRequest({ count: 3 }), { env: { GEMINI_API_KEY: FAKE_KEY }, fetchImpl })
  assert.equal(result.status, 502)
  assert.equal(result.body.success, false)
  if (!result.body.success) assert.match(result.body.error, /jumlah soal/)
})

test('29. body tidak valid -> 400', async () => {
  assert.equal((await handleGenerateQuestionsRequest(null, { env: {} })).status, 400)
  assert.equal((await handleGenerateQuestionsRequest('{invalid', { env: {} })).status, 400)
  assert.equal((await handleGenerateQuestionsRequest(validRequest({ count: 21 }), { env: {} })).status, 400)
})

test('30. prompt builder menyertakan materi dan jumlah soal', () => {
  const request = { source: 'materi X', questionType: 'essay' as const, count: 5, difficulty: 'medium' as const, grade: 'X TKJ', language: 'id' }
  const instruction = buildGenerateQuestionsSystemInstruction(request)
  const userPrompt = buildGenerateQuestionsUserPrompt(request)
  assert.match(instruction, /X TKJ/)
  assert.match(instruction, /uraian/)
  assert.match(userPrompt, /materi X/)
  assert.match(userPrompt, /5 soal/)
})

// ---- E. Frontend service ----

test('31. service mem-parse response success', async () => {
  const result = await generateQuestions({ source: 'materi', count: 1, questionType: 'essay', difficulty: 'medium' }, {
    fetchImpl: async () => jsonResponse({ success: true, questions: [validEssay], count: 1 }),
  })
  assert.equal(result.success, true)
  if (result.success) assert.equal(result.questions.length, 1)
})

test('32. service menangani HTTP error (body error dipakai)', async () => {
  const result = await generateQuestions({ source: 'materi', count: 1, questionType: 'essay', difficulty: 'medium' }, {
    fetchImpl: async () => jsonResponse({ success: false, error: 'Materi/sumber tidak boleh kosong.' }, 400),
  })
  assert.deepEqual(result, { success: false, error: 'Materi/sumber tidak boleh kosong.' })
})

test('33. service menangani network error', async () => {
  const result = await generateQuestions({ source: 'materi', count: 1, questionType: 'essay', difficulty: 'medium' }, {
    fetchImpl: async () => {
      throw new TypeError('fetch failed')
    },
  })
  assert.equal(result.success, false)
  if (!result.success) assert.match(result.error, /Gagal terhubung/)
})

test('34. service menangani timeout (abort)', async () => {
  const result = await generateQuestions({ source: 'materi', count: 1, questionType: 'essay', difficulty: 'medium' }, {
    fetchImpl: async () => {
      throw new DOMException('The operation was aborted.', 'AbortError')
    },
  })
  assert.equal(result.success, false)
  if (!result.success) assert.match(result.error, /timeout/i)
})

// ---- F. Frontend validation ----

test('35. array soal valid diterima frontend', () => {
  const result = validateAiGeneratedQuestions([validMc, validEssay])
  assert.equal(result.ok, true)
})

test('36. array kosong / satu soal invalid -> seluruhnya ditolak', () => {
  assert.equal(validateAiGeneratedQuestions([]).ok, false)
  const bad = { ...validMc, options: validMc.options.slice(0, 2) }
  assert.equal(validateAiGeneratedQuestions([validMc, bad]).ok, false)
})

// ---- G. Selection ----

test('37. selection: default semua terpilih, toggle, set all, count', () => {
  const initial = initialSelection(3)
  assert.deepEqual(initial, [true, true, true])
  assert.equal(countSelected(initial), 3)
  assert.equal(allSelected(initial), true)
  assert.deepEqual(toggleAt(initial, 1), [true, false, true])
  assert.equal(countSelected(toggleAt(initial, 1)), 2)
  assert.equal(allSelected(setAll(initial, false)), false)
  assert.equal(countSelected(setAll(initial, false)), 0)
  assert.equal(countSelected(initialSelection(0)), 0)
  assert.equal(allSelected([]), false)
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
