import type { ChangeEvent } from 'react'
import type { LKPDMetadata } from '../../models/lkpd'
import { Input, Label } from '../ui/inputs'

interface MetadataFieldsProps {
  value: LKPDMetadata
  onChange: (next: LKPDMetadata) => void
}

function fieldSetter(onChange: (next: LKPDMetadata) => void, value: LKPDMetadata, field: keyof LKPDMetadata) {
  return (event: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [field]: event.target.value })
}

export function MetadataFields({ value, onChange }: MetadataFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="metadata-title">Judul LKPD</Label>
        <Input
          id="metadata-title"
          value={value.title}
          onChange={fieldSetter(onChange, value, 'title')}
          placeholder="Contoh: Dasar Jaringan Komputer"
        />
      </div>
      <div>
        <Label htmlFor="metadata-subject">Mata Pelajaran</Label>
        <Input id="metadata-subject" value={value.subject} onChange={fieldSetter(onChange, value, 'subject')} placeholder="Informatika" />
      </div>
      <div>
        <Label htmlFor="metadata-class">Kelas</Label>
        <Input id="metadata-class" value={value.classLevel} onChange={fieldSetter(onChange, value, 'classLevel')} placeholder="X" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="metadata-major">Jurusan</Label>
        <Input id="metadata-major" value={value.major} onChange={fieldSetter(onChange, value, 'major')} placeholder="Teknik Komputer dan Jaringan" />
      </div>
      <div>
        <Label htmlFor="metadata-semester">Semester</Label>
        <Input id="metadata-semester" value={value.semester} onChange={fieldSetter(onChange, value, 'semester')} placeholder="Ganjil" />
      </div>
      <div>
        <Label htmlFor="metadata-time">Alokasi Waktu</Label>
        <Input id="metadata-time" value={value.alokasiWaktu} onChange={fieldSetter(onChange, value, 'alokasiWaktu')} placeholder="4 JP" />
      </div>
      <div>
        <Label htmlFor="metadata-school">Nama Sekolah</Label>
        <Input id="metadata-school" value={value.schoolName} onChange={fieldSetter(onChange, value, 'schoolName')} placeholder="SMK Negeri 1 Teknologi" />
      </div>
      <div>
        <Label htmlFor="metadata-teacher">Nama Guru</Label>
        <Input id="metadata-teacher" value={value.teacherName} onChange={fieldSetter(onChange, value, 'teacherName')} placeholder="Budi Santoso" />
      </div>
    </div>
  )
}
