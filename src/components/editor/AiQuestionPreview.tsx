import type { AiGeneratedQuestion } from '../../types/ai'

interface AiQuestionPreviewProps {
  question: AiGeneratedQuestion
  number: number
  selected: boolean
  onToggle: () => void
}

// Satu soal hasil AI di preview: checkbox + teks soal + opsi + kunci jawaban
// (untuk guru, TIDAK tampil di LKPD student-facing).
export function AiQuestionPreview({ question, number, selected, onToggle }: AiQuestionPreviewProps) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 shrink-0" aria-label={`Pilih soal ${number}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">
            <span className="text-slate-400">{number}.</span> {question.text}
          </p>

          {question.type === 'multiple_choice' && (
            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {question.options.map((option) => (
                <p key={option.label} className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-500">{option.label}.</span> {option.text}
                </p>
              ))}
            </div>
          )}

          {(question.answer || question.explanation) && (
            <div className="mt-2 space-y-0.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
              {question.answer && (
                <p>
                  <span className="font-semibold text-slate-700">
                    {question.type === 'multiple_choice' ? 'Jawaban AI:' : 'Jawaban acuan:'}
                  </span>{' '}
                  {question.answer}
                </p>
              )}
              {question.explanation && (
                <p>
                  <span className="font-semibold text-slate-700">Pembahasan:</span> {question.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </label>
    </li>
  )
}
