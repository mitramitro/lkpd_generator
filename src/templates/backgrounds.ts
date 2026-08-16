import type { LKPDTemplate, TemplateContentArea } from '../models/template'
import { A4, baseComponents, baseTypography } from './base'

// Template M5.3: latar dekoratif penuh halaman dari public/bg/.
// backgroundImage hanya dekorasi layer halaman — tidak menjadi block, tidak
// ikut pagination, dan tidak dihitung sebagai tinggi konten.
//
// contentArea diset sama dengan margins A4 base sehingga pagination tidak
// berubah: halaman tetap memiliki ruang yang sama untuk header/konten/footer.

const contentArea: TemplateContentArea = {
  top: A4.margins.top,
  right: A4.margins.right,
  bottom: A4.margins.bottom,
  left: A4.margins.left,
}

function backgroundTemplate(
  id: string,
  name: string,
  description: string,
  backgroundImage: string,
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
  '#1d4ed8',
  '#1e3a8a',
  '#f59e0b',
)

export const background2: LKPDTemplate = backgroundTemplate(
  'bg-2',
  'Background 2',
  'Latar dekoratif penuh halaman (bg2.jfif)',
  '/bg/bg2.jfif',
  '#047857',
  '#065f46',
  '#f59e0b',
)

export const background3: LKPDTemplate = backgroundTemplate(
  'bg-3',
  'Background 3',
  'Latar dekoratif penuh halaman (bg3.jfif)',
  '/bg/bg3.jfif',
  '#b45309',
  '#92400e',
  '#0ea5e9',
)

export const background4: LKPDTemplate = backgroundTemplate(
  'bg-4',
  'Background 4',
  'Latar dekoratif penuh halaman (bg4.jfif)',
  '/bg/bg4.jfif',
  '#7c3aed',
  '#6d28d9',
  '#f59e0b',
)
