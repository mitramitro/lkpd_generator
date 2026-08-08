import type { LKPDTemplate } from '../models/template'
import { A4, baseComponents, baseTypography } from './base'

export const modernBlue: LKPDTemplate = {
  id: 'modern-blue',
  name: 'Modern Blue',
  description: 'Biru modern dengan aksen jingga',
  ...A4,
  typography: baseTypography,
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#f59e0b',
    background: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
    border: '#e5e7eb',
  },
  components: {
    ...baseComponents,
    header: { enabled: true, titleColor: '#1e40af', subtitleColor: '#4b5563', borderColor: '#2563eb' },
    footer: { enabled: true, textColor: '#6b7280', showPageNumber: true },
    question: { ...baseComponents.question, numberBg: '#2563eb', essayLineColor: '#d1d5db' },
    image: { ...baseComponents.image, radius: 6, borderColor: '#e5e7eb' },
  },
}
