export type PageSize = 'A4'

export interface TemplateMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface TemplateTypography {
  fontFamily: string
  headingFontFamily: string
  bodyFontSize: number
  questionFontSize: number
  heading1Size: number
  heading2Size: number
  heading3Size: number
  lineHeight: number
  headingLineHeight: number
}

export interface TemplateColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  muted: string
  border: string
}

export interface TemplateHeader {
  enabled: boolean
  titleColor: string
  subtitleColor: string
  borderColor: string
}

export interface TemplateFooter {
  enabled: boolean
  textColor: string
  showPageNumber: boolean
}

export interface TemplateQuestionStyle {
  numberBadge: boolean
  numberColor: string
  numberBg: string
  optionsSpacing: number
  essayLineColor: string
}

export interface TemplateImageStyle {
  radius: number
  borderColor: string
  maxWidthPercent: number
}

export interface TemplateComponents {
  header: TemplateHeader
  footer: TemplateFooter
  question: TemplateQuestionStyle
  image: TemplateImageStyle
}

export interface LKPDTemplate {
  id: string
  name: string
  description: string
  pageSize: PageSize
  pageWidth: number
  pageHeight: number
  margins: TemplateMargins
  typography: TemplateTypography
  colors: TemplateColors
  components: TemplateComponents
}
