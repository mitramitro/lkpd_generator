import { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input, Label, Textarea } from '../ui/inputs'

interface ImportMateriModalProps {
  open: boolean
  onClose: () => void
  onImport: (title: string, content: string) => void
}

export function ImportMateriModal({ open, onClose, onImport }: ImportMateriModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleReset = () => {
    setTitle('')
    setContent('')
    onClose()
  }

  const handleImport = () => {
    if (!content.trim()) return
    onImport(title.trim(), content)
    handleReset()
  }

  return (
    <Modal
      open={open}
      title="Import Materi"
      onClose={handleReset}
      footer={
        <>
          <Button variant="secondary" onClick={handleReset}>
            Batalkan
          </Button>
          <Button onClick={handleImport} disabled={!content.trim()}>
            Masukkan Materi
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="material-title">Judul materi</Label>
          <Input
            id="material-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Contoh: JARINGAN KOMPUTER"
          />
        </div>
        <div>
          <Label htmlFor="material-content">Tempel Materi</Label>
          <Textarea
            id="material-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={14}
            placeholder={'Jaringan komputer adalah ...\n\nLAN adalah ...\n\nWAN adalah ...'}
          />
          <p className="mt-1 text-xs text-slate-400">
            Paragraf (baris kosong) dan baris baru dipertahankan saat ditampilkan. Materi yang panjang akan
            mengalir ke halaman berikutnya secara natural.
          </p>
        </div>
      </div>
    </Modal>
  )
}
