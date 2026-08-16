import type { LKPDTemplate, TemplateContentArea } from '../models/template'
import { A4, baseComponents, baseTypography } from './base'

// Template M5.3: latar dekoratif penuh halaman dari public/bg/.
// backgroundImage hanya dekorasi layer halaman — tidak menjadi block, tidak
// ikut pagination, dan tidak dihitung sebagai tinggi konten.
//
// contentArea adalah "safe area" desain: ruang konten efektif (header, judul,
// soal, opsi, gambar, footer) yang dijamin berada di dalam bingkai/dekorasi
// background. Nilainya berbeda tiap background sesuai hasil analisis gambar:
//   - bg-1: bingkai ~21mm dari setiap tepi; konten dimasukkan ~3-4mm di dalam.
//   - bg-2: dekorasi kolom tepi (~13-15mm kiri, ~14-30mm kanan); konten di dalam.
//   - bg-3: latar terang merata tanpa bingkai; margin tetap seperti A4 base.
//   - bg-4: seperti bg-1 (bingkai ~21mm); konten dimasukkan ke dalam.
// contentArea juga dipakai pagination (lebar/tinggi konten) sehingga preview,
// print, dan estimasi dashboard memakai ukuran yang identik.

function backgroundTemplate(
  id: string,
  name: string,
  description: string,
  backgroundImage: string,
  contentArea: TemplateContentArea,
  primary: string,
  secondary: string,
  accent: string,
): LKPDTemplate {
  return {
    id,
    name,
    description,
    ...A4,
    backgroundImage,
    contentArea,
    typography: baseTypography,
    colors: {
      primary,
      secondary,
      accent,
      background: '#ffffff',
      text: '#1f2937',
      muted: '#6b7280',
      border: '#d1d5db',
    },
    components: {
      ...baseComponents,
      header: { enabled: true, titleColor: primary, subtitleColor: '#4b5563', borderColor: primary },
      footer: { enabled: true, textColor: '#6b7280', showPageNumber: true },
      question: { ...baseComponents.question, numberBg: primary, essayLineColor: '#d1d5db' },
      image: { ...baseComponents.image, radius: 4, borderColor: '#d1d5db' },
    },
  }
}

export const background1: LKPDTemplate = backgroundTemplate(
  'bg-1',
  'Background 1',
  'Latar dekoratif penuh halaman (bg1.jfif)',
  '/bg/bg1.jfif',
  { top: 25, right: 25, bottom: 24, left: 25 },
  '#1d4ed8',
  '#1e3a8a',
  '#f59e0b',
)

export const background2: LKPDTemplate = backgroundTemplate(
  'bg-2',
  'Background 2',
  'Latar dekoratif penuh halaman (bg2.jfif)',
  '/bg/bg2.jfif',
  { top: 19, right: 21, bottom: 18, left: 20 },
  '#047857',
  '#065f46',
  '#f59e0b',
)

export const background3: LKPDTemplate = backgroundTemplate(
  'bg-3',
  'Background 3',
  'Latar dekoratif penuh halaman (bg3.jfif)',
  '/bg/bg3.jfif',
  { top: 18, right: 18, bottom: 16, left: 18 },
  '#b45309',
  '#92400e',
  '#0ea5e9',
)

export const background4: LKPDTemplate = backgroundTemplate(
  'bg-4',
  'Background 4',
  'Latar dekoratif penuh halaman (bg4.jfif)',
  '/bg/bg4.jfif',
  { top: 24, right: 24, bottom: 22, left: 24 },
  '#7c3aed',
  '#6d28d9',
  '#f59e0b',
)
