import type { LKPDDocument } from '../models/lkpd'
import { createEmptyDocument } from './factories'

export function createSampleDocument(): LKPDDocument {
  const document = createEmptyDocument(
    {
      title: 'Dasar Jaringan Komputer',
      subject: 'Informatika',
      classLevel: 'X',
      major: 'Teknik Komputer dan Jaringan',
      semester: 'Ganjil',
      alokasiWaktu: '4 JP',
      schoolName: 'SMK Negeri 1 Teknologi',
      teacherName: 'Budi Santoso',
    },
    'modern-blue',
  )

  document.blocks = [
    {
      id: 'seed-heading-1',
      type: 'heading',
      level: 1,
      text: 'Aktivitas 1: Memahami Perangkat Jaringan',
    },
    {
      id: 'seed-text-1',
      type: 'text',
      text: 'Perhatikan gambar dan materi singkat berikut, kemudian jawablah pertanyaan dengan teliti.',
    },
    {
      id: 'seed-q-1',
      type: 'question',
      number: 1,
      questionType: 'multiple_choice',
      text: 'Apa fungsi utama dari router dalam sebuah jaringan?',
      options: ['Menghubungkan jaringan yang berbeda', 'Menyimpan data permanen', 'Mencetak dokumen', 'Menampilkan gambar'],
    },
    {
      id: 'seed-q-2',
      type: 'question',
      number: 2,
      questionType: 'multiple_choice',
      text: 'Perangkat yang berfungsi menghubungkan banyak komputer dalam satu LAN adalah …',
      options: ['Router', 'Switch', 'Modem', 'Printer'],
    },
    {
      id: 'seed-q-3',
      type: 'question',
      number: 3,
      questionType: 'essay',
      text: 'Jelaskan perbedaan antara LAN dan WAN!',
      answerSpace: { lines: 5 },
    },
    {
      id: 'seed-q-4',
      type: 'question',
      number: 4,
      questionType: 'essay',
      text: 'Sebutkan tiga jenis topologi jaringan beserta satu kelebihannya masing-masing!',
      answerSpace: { lines: 4 },
    },
    {
      id: 'seed-heading-2',
      type: 'heading',
      level: 2,
      text: 'Aktivitas 2: Praktikum Singkat',
    },
    {
      id: 'seed-q-5',
      type: 'question',
      number: 5,
      questionType: 'essay',
      text: 'Dengan menggunakan perangkat di laboratorium, buatlah jaringan sederhana dua komputer dan jelaskan langkah kerjamu!',
      answerSpace: { lines: 6 },
    },
  ]

  return document
}
