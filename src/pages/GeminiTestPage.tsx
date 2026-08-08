import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ArrowLeftIcon } from '../components/ui/icons'
import { Label, Textarea } from '../components/ui/inputs'
import { testGemini } from '../services/ai'

type Status = 'idle' | 'loading' | 'success' | 'error'

const DEFAULT_PROMPT = 'Jelaskan apa itu jaringan komputer untuk siswa SMK kelas X dalam 3 kalimat.'

export function GeminiTestPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const handleTest = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || status === 'loading') return
    setStatus('loading')
    setResult('')
    setError('')
    const response = await testGemini(trimmed)
    if (response.success) {
      setResult(response.text)
      setStatus('success')
    } else {
      setError(response.error)
      setStatus('error')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon />
        Kembali ke Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Gemini AI Test</h1>
      <p className="mt-1 text-sm text-slate-500">
        Uji koneksi aplikasi ke Gemini API. Request diproses lewat server — API key tidak pernah dikirim ke browser.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Label htmlFor="ai-prompt">Prompt</Label>
        <Textarea
          id="ai-prompt"
          rows={5}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Masukkan prompt untuk menguji Gemini..."
          disabled={status === 'loading'}
        />
        <div className="mt-3 flex items-center justify-end">
          <Button onClick={() => void handleTest()} disabled={status === 'loading'}>
            {status === 'loading' ? 'Memproses...' : 'Test Gemini'}
          </Button>
        </div>
      </div>

      {status === 'success' && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Response Gemini</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{result}</p>
        </div>
      )}

      {status === 'error' && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  )
}
