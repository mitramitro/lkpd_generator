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

// Area aman konten untuk template bergambar. Nilai dalam mm, dihitung dari tepi
// halaman A4. Konten (header/materi/soal/gambar/galeri) hanya dirender di dalam
// area ini sehingga tidak tertutup dekorasi latar.
export interface TemplateContentArea {
  top: number
  right: number
  bottom: number
  left: number
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
  // M5.3: latar dekoratif halaman A4. Path relatif terhadap /public (mis. /bg/bg1.jfif).
  // Hanya dekorasi layer halaman — tidak masuk block, tidak ikut pagination.
  backgroundImage?: string
  // Area aman konten (mm). Diabaikan jika backgroundImage kosong; jika ada,
  // dipakai sebagai padding halaman sebagai pengganti margins.
  contentArea?: TemplateContentArea
}
