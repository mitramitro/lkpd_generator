import { useMemo, useState } from 'react'
import type { Block, LKPDDocument, QuestionBlock } from '../../models/lkpd'
import { createQuestionBlockFromAi, extractMaterialText } from '../../lib/aiQuestionFactory'
import { validateAiGeneratedQuestions } from '../../lib/aiQuestionValidation'
import { allSelected, countSelected, initialSelection, setAll, toggleAt } from '../../lib/aiQuestionSelection'
import { generateQuestions } from '../../services/ai'
import type { AiDifficulty, AiGeneratedQuestion, AiRequestQuestionType } from '../../types/ai'
import type { ImportMode } from '../../store/documentStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input, Label, Select, Textarea } from '../ui/inputs'
import { AiQuestionPreview } from './AiQuestionPreview'

interface AiGenerateQuestionsModalProps {
  open: boolean
  document: LKPDDocument
  onClose: () => void
  onInsert: (mode: ImportMode, blocks: Block[]) => void
}

const QUESTION_TYPE_LABELS: Record<AiRequestQuestionType, string> = {
  multiple_choice: 'Pilihan Ganda',
  essay: 'Uraian',
  mixed: 'Campuran',
}

const DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
}

export function AiGenerateQuestionsModal({ open, document, onClose, onInsert }: AiGenerateQuestionsModalProps) {
  const [source, setSource] = useState('')
  const [count, setCount] = useState(10)
  const [questionType, setQuestionType] = useState<AiRequestQuestionType>('multiple_choice')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium')
  const [grade, setGrade] = useState('')
  const [language, setLanguage] = useState('id')
  const [useMaterial, setUseMaterial] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState<AiGeneratedQuestion[]>([])
  const [selection, setSelection] = useState<boolean[]>([])
  const [inserted, setInserted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const materialText = useMemo(() => extractMaterialText(document.blocks), [document])
  const hasMaterial = materialText !== null
  const selectedCount = countSelected(selection)

  const handleReset = () => {
    setSource('')
    setCount(10)
    setQuestionType('multiple_choice')
    setDifficulty('medium')
    setGrade('')
    setLanguage('id')
    setUseMaterial(false)
    setLoading(false)
    setPreview(false)
    setError('')
    setQuestions([])
    setSelection([])
    setInserted(false)
    setSuccessMessage('')
    onClose()
  }

  const handleUseMaterial = (checked: boolean) => {
    setUseMaterial(checked)
    if (checked && materialText) setSource(materialText)
  }

  const handleGenerate = async () => {
    const trimmed = source.trim()
    if (!trimmed || loading) return
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setError('Jumlah soal harus antara 1 dan 20.')
      return
    }
    setLoading(true)
    setError('')
    setInserted(false)
    setSuccessMessage('')
    const response = await generateQuestions({
      source: trimmed,
      count,
      questionType,
      difficulty,
      grade: grade.trim() || undefined,
      language,
    })
    setLoading(false)
    if (response.success) {
      setQuestions(response.questions)
      setSelection(initialSelection(response.questions.length))
      setPreview(true)
    } else {
      setError(response.error)
    }
  }

  const handleToggle = (index: number) => setSelection((current) => toggleAt(current, index))

  const handleInsert = () => {
    const validated = validateAiGeneratedQuestions(questions)
    if (!validated.ok) {
      setError(validated.error)
      return
    }
    const blocks = validated.questions
      .map((question, index) => (selection[index] ? createQuestionBlockFromAi(question) : null))
      .filter((block): block is QuestionBlock => block !== null)
    if (blocks.length === 0) return
    onInsert('append', blocks)
    setInserted(true)
    setSuccessMessage(`${blocks.length} soal berhasil ditambahkan ke LKPD.`)
    setError('')
  }

  const sourcePreview = source.trim()

  return (
    <Modal
      open={open}
      title="✨ Buat Soal dengan AI"
      onClose={handleReset}
      footer={
        preview ? (
          <>
            <span className="mr-auto text-sm text-slate-500">{selectedCount} soal dipilih</span>
            <Button variant="secondary" onClick={() => setPreview(false)} disabled={inserted}>
              Kembali
            </Button>
            <Button variant="secondary" onClick={() => void handleGenerate()} disabled={inserted}>
              Regenerate
            </Button>
            <Button onClick={handleInsert} disabled={inserted || selectedCount === 0}>
              {inserted ? 'Soal Sudah Ditambahkan' : `Masukkan ${selectedCount} Soal ke LKPD`}
            </Button>
          </>
        ) : (
          <Button onClick={() => void handleGenerate()} disabled={loading || !sourcePreview}>
            {loading ? 'AI sedang menyusun soal...' : '✨ Generate Soal'}
          </Button>
        )
      }
    >
      {successMessage && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      {!preview && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="ai-source">Sumber Materi</Label>
            <Textarea
              id="ai-source"
              rows={6}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              disabled={loading}
              placeholder="Masukkan materi atau konteks soal..."
            />
            <p className="mt-1 text-xs text-slate-400">Maksimal 30.000 karakter.</p>
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useMaterial}
                disabled={!hasMaterial || loading}
                onChange={(event) => handleUseMaterial(event.target.checked)}
              />
              Gunakan Materi LKPD
            </label>
            {!hasMaterial ? (
              <p className="mt-1 text-xs text-slate-400">Tidak ada block Materi di LKPD ini.</p>
            ) : (
              useMaterial && (
                <p className="mt-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Sumber dipakai:{' '}
                  <span className="line-clamp-3">{materialText}</span>
                </p>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ai-count">Jumlah Soal</Label>
              <Input
                id="ai-count"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="ai-type">Jenis Soal</Label>
              <Select
                id="ai-type"
                value={questionType}
                onChange={(event) => setQuestionType(event.target.value as AiRequestQuestionType)}
                disabled={loading}
              >
                <option value="multiple_choice">Pilihan Ganda</option>
                <option value="essay">Uraian</option>
                <option value="mixed">Campuran</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ai-difficulty">Tingkat Kesulitan</Label>
              <Select
                id="ai-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as AiDifficulty)}
                disabled={loading}
              >
                <option value="easy">Mudah</option>
                <option value="medium">Sedang</option>
                <option value="hard">Sulit</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ai-grade">Kelas (opsional)</Label>
              <Input
                id="ai-grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                placeholder="cth: X TKJ"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="ai-language">Bahasa</Label>
              <Select id="ai-language" value={language} onChange={(event) => setLanguage(event.target.value)} disabled={loading}>
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </Select>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-500">Proses dapat membutuhkan beberapa detik.</p>}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Ringkasan Konfigurasi</p>
            <ul className="mt-1 space-y-0.5">
              <li>
                Sumber:{' '}
                {sourcePreview ? `${sourcePreview.slice(0, 60)}${sourcePreview.length > 60 ? '…' : ''}` : '(kosong)'}
              </li>
              <li>Jumlah: {count}</li>
              <li>Jenis: {QUESTION_TYPE_LABELS[questionType]}</li>
              <li>Kesulitan: {DIFFICULTY_LABELS[difficulty]}</li>
              <li>Kelas: {grade.trim() || '-'}</li>
              <li>Bahasa: {language === 'id' ? 'Indonesia' : language}</li>
            </ul>
          </div>

          {error && !inserted && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{questions.length} soal berhasil dibuat.</p>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allSelected(selection)}
                onChange={(event) => setSelection(setAll(selection, event.target.checked))}
              />
              Pilih Semua
            </label>
          </div>

          <ul className="space-y-2">
            {questions.map((question, index) => (
              <AiQuestionPreview
                key={index}
                question={question}
                number={index + 1}
                selected={selection[index] ?? false}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </ul>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Periksa kembali soal dan kunci jawaban AI sebelum digunakan.
          </p>

          {error && !inserted && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
