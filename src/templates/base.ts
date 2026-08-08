import type { LKPDTemplate, TemplateComponents, TemplateTypography } from '../models/template'

export const A4 = {
  pageSize: 'A4',
  pageWidth: 210,
  pageHeight: 297,
  margins: { top: 18, right: 18, bottom: 16, left: 18 },
} as const

export const baseTypography: TemplateTypography = {
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  headingFontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  bodyFontSize: 11,
  questionFontSize: 11.5,
  heading1Size: 16,
  heading2Size: 13,
  heading3Size: 11.5,
  lineHeight: 1.5,
  headingLineHeight: 1.3,
}

export const baseComponents: TemplateComponents = {
  header: {
    enabled: true,
    titleColor: '',
    subtitleColor: '',
    borderColor: '',
  },
  footer: {
    enabled: true,
    textColor: '',
    showPageNumber: true,
  },
  question: {
    numberBadge: true,
    numberColor: '#ffffff',
    numberBg: '',
    optionsSpacing: 6,
    essayLineColor: '',
  },
  image: {
    radius: 4,
    borderColor: '',
    maxWidthPercent: 85,
  },
}

export type { LKPDTemplate }
