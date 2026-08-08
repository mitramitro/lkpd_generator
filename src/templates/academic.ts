import type { LKPDTemplate } from '../models/template'
import { A4, baseComponents, baseTypography } from './base'

export const academic: LKPDTemplate = {
  id: 'academic',
  name: 'Academic',
  description: 'Serif klasik untuk dokumen formal',
  ...A4,
  typography: {
    ...baseTypography,
    fontFamily: 'Georgia, "Times New Roman", serif',
    headingFontFamily: 'Georgia, "Times New Roman", serif',
    questionFontSize: 11.5,
  },
  colors: {
    primary: '#0f4c5c',
    secondary: '#0b3c49',
    accent: '#e36414',
    background: '#fdfcf9',
    text: '#1f2937',
    muted: '#6b7280',
    border: '#d1d5db',
  },
  components: {
    ...baseComponents,
    header: { enabled: true, titleColor: '#0b3c49', subtitleColor: '#6b7280', borderColor: '#0f4c5c' },
    footer: { enabled: true, textColor: '#6b7280', showPageNumber: true },
    question: { ...baseComponents.question, numberBg: '#0f4c5c', essayLineColor: '#d1d5db' },
    image: { ...baseComponents.image, radius: 2, borderColor: '#d1d5db' },
  },
}
