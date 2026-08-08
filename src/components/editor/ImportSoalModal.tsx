import { useMemo, useState } from 'react'
import type { Block } from '../../models/lkpd'
import { createQuestionBlockFromParsed, createTextBlock } from '../../lib/factories'
import { parseQuestions } from '../../lib/questionParser'
import type { ImportMode } from '../../store/documentStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Label, Select, Textarea } from '../ui/inputs'

interface ImportSoalModalProps {
  open: boolean
  existingCount: number
  onClose: () => void
  onImport: (mode: ImportMode, blocks: Block[]) => void
}

export function ImportSoalModal({ open, existingCount, onClose, onImport }: ImportSoalModalProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ImportMode>('append')
  const [importUnrecognized, setImportUnrecognized] = useState(true)

  const result = useMemo(() => parseQuestions(input), [input])
  const hasUnrecognized = result.unrecognized.length > 0
  const hasAnything = result.questions.length > 0 || (hasUnrecognized && importUnrecognized)

  const handleReset = () => {
    setInput('')
    setMode('append')
    setImportUnrecognized(true)
    onClose()
  }

  const handleImport = () => {
    const blocks: Block[] = result.questions.map(createQuestionBlockFromParsed)
    if (importUnrecognized) {
      blocks.push(...result.unrecognized.map((line) => createTextBlock(line)))
    }
    onImport(mode, blocks)
    handleReset()
  }

  return (
    <Modal
      open={open}
      title="Import Soal"
      onClose={handleReset}
      footer={
        <>
          <Button variant="secondary" onClick={handleReset}>
            Batalkan
          </Button>
          <Button onClick={handleImport} disabled={!hasAnything}>
            Masukkan {result.questions.length > 0 && `(${result.questions.length} soal)`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="import-mode">Cara Memasukkan</Label>
          <Select
            id="import-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as ImportMode)}
          >
            <option value="append">Tambahkan ke akhir dokumen</option>
            <option value="replace">Ganti soal yang sudah ada ({existingCount} soal)</option>
          </Select>
          {mode === 'replace' && (
            <p className="mt-1 text-xs text-slate-400">
              Hanya block soal yang diganti. Heading, teks, dan gambar lain tetap dipertahankan.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="import-input">Tempel Soal</Label>
          <Textarea
            id="import-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={10}
            placeholder={'1. Teks soal...\nA. Opsi A\nB. Opsi B\nC. Opsi C\nD. Opsi D\n\n2) Soal uraian tanpa pilihan...'}
          />
          <p className="mt-1 text-xs text-slate-400">
            Format yang dikenali: &quot;1.&quot;, &quot;1)&quot;, &quot;Soal 1.&quot; untuk nomor; &quot;A.&quot;, &quot;b)&quot;
            untuk opsi (A–D / a–d). Soal tanpa opsi menjadi Uraian dengan baris jawaban otomatis.
          </p>
        </div>

        <div>
          <Label>Hasil Parsing ({result.questions.length} soal)</Label>
          {result.questions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
              Belum ada soal yang dikenali.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {result.questions.map((question, index) => (
                <li key={index} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-slate-700">
                    <span className="font-semibold text-slate-400">{index + 1}.</span>{' '}
                    {question.text || <span className="italic text-slate-400">(teks kosong)</span>}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      question.questionType === 'multiple_choice'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {question.questionType === 'multiple_choice'
                      ? `Pilihan Ganda • ${question.options.length} opsi`
                      : 'Uraian'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasUnrecognized && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={importUnrecognized}
                onChange={(event) => setImportUnrecognized(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                {result.unrecognized.length} baris tidak dikenali sebagai soal — impor sebagai teks biasa:
                <span className="mt-1 block max-h-16 overflow-hidden text-xs text-amber-600">
                  {result.unrecognized.slice(0, 6).map((line, index) => (
                    <span key={index} className="block">
                      {line}
                    </span>
                  ))}
                  {result.unrecognized.length > 6 && <span className="block">…dan lainnya</span>}
                </span>
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  )
}
