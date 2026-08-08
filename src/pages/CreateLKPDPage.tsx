import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MetadataFields } from '../components/editor/MetadataFields'
import { TemplatePicker } from '../components/editor/TemplatePicker'
import { Button } from '../components/ui/Button'
import { ArrowLeftIcon } from '../components/ui/icons'
import { EMPTY_METADATA, type LKPDMetadata } from '../models/lkpd'
import { useDocumentStore } from '../store/documentStore'
import { DEFAULT_TEMPLATE_ID } from '../templates'

export function CreateLKPDPage() {
  const navigate = useNavigate()
  const createDocument = useDocumentStore((state) => state.createDocument)
  const [form, setForm] = useState<LKPDMetadata>({ ...EMPTY_METADATA })
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Judul LKPD wajib diisi.')
      return
    }
    const document = createDocument(form, templateId)
    navigate(`/editor/${document.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon />
        Kembali ke Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Buat LKPD Baru</h1>
      <p className="mt-1 text-sm text-slate-500">
        Isi identitas LKPD terlebih dahulu. Konten soal akan diatur di editor.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Identitas LKPD</h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <MetadataFields value={form} onChange={setForm} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Template Desain</h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <TemplatePicker value={templateId} onChange={setTemplateId} />
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to="/">
            <Button variant="secondary">Batal</Button>
          </Link>
          <Button type="submit">Simpan & Lanjut ke Editor</Button>
        </div>
      </form>
    </div>
  )
}
