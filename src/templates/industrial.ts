import type { LKPDTemplate } from '../models/template'
import { A4, baseComponents, baseTypography } from './base'

export const industrial: LKPDTemplate = {
  id: 'industrial',
  name: 'Industrial',
  description: 'Kesan teknikal, oranye dan abu-abu',
  ...A4,
  typography: {
    ...baseTypography,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    headingFontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  colors: {
    primary: '#ea580c',
    secondary: '#431407',
    accent: '#facc15',
    background: '#fffaf5',
    text: '#1c1917',
    muted: '#78716c',
    border: '#d6d3d1',
  },
  components: {
    ...baseComponents,
    header: { enabled: true, titleColor: '#431407', subtitleColor: '#78716c', borderColor: '#ea580c' },
    footer: { enabled: true, textColor: '#78716c', showPageNumber: true },
    question: { ...baseComponents.question, numberBg: '#ea580c', essayLineColor: '#d6d3d1' },
    image: { ...baseComponents.image, radius: 0, borderColor: '#d6d3d1' },
  },
}
