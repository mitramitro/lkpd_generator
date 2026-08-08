import type { LKPDTemplate } from '../models/template'
import { A4, baseComponents, baseTypography } from './base'

export const minimal: LKPDTemplate = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Hitam putih, bersih dan fokus',
  ...A4,
  typography: baseTypography,
  colors: {
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#0f172a',
    background: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
  },
  components: {
    ...baseComponents,
    header: { enabled: true, titleColor: '#0f172a', subtitleColor: '#64748b', borderColor: '#0f172a' },
    footer: { enabled: true, textColor: '#64748b', showPageNumber: true },
    question: { ...baseComponents.question, numberBg: '#0f172a', essayLineColor: '#e2e8f0' },
    image: { ...baseComponents.image, radius: 2, borderColor: '#e2e8f0' },
  },
}
