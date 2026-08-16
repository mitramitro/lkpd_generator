import type { TemplateContentArea } from './template'

export interface LKPDMetadata {
  title: string
  subject: string
  classLevel: string
  major: string
  semester: string
  alokasiWaktu: string
  schoolName: string
  teacherName: string
}

// M5.3.1 — latar belakang halaman.
// mode 'builtin' : memakai salah satu background bawaan (bg-1..bg-4), properti backgroundId.
// mode 'custom'  : memakai gambar custom yang diunggah, properti imageId (referensi blob IndexedDB).
// mode 'default' : tidak ada override — mengikuti default dokumen/template (dipakai pada UI
//                  sebagai cara "menghapus" override halaman; TIDAK boleh disimpan).
export type BackgroundMode = 'builtin' | 'custom'

export interface PageBackgroundConfig {
  mode: BackgroundMode
  backgroundId?: string
  imageId?: string
  // Opsional: override safe area konten untuk halaman ini. Biasanya tidak diisi
  // (dihitung otomatis: builtin dari template, custom memakai DEFAULT_CUSTOM_CONTENT_AREA).
  contentArea?: TemplateContentArea
}

// Metadata satu background custom milik dokumen. Blob disimpan di IndexedDB
// (object store images, kind='background'); field ini HANYA metadata + referensi.
// dataUrl diisi sementara saat serialisasi backup/import dan selalu di-strip
// sebelum dokumen disimpan di IndexedDB/localStorage.
export interface CustomBackgroundMeta {
  id: string
  documentId: string
  kind: 'background'
  mimeType: string
  filename: string
  width: number
  height: number
  size: number
  createdAt: string
  dataUrl?: string
}

export interface HeadingBlock {
  id: string
  type: 'heading'
  level: 1 | 2 | 3
  text: string
}

export interface TextBlock {
  id: string
  type: 'text'
  text: string
}

interface QuestionBase {
  id: string
  type: 'question'
  number: number
  text: string
}

export interface MultipleChoiceQuestion extends QuestionBase {
  questionType: 'multiple_choice'
  options: string[]
}

export interface EssayQuestion extends QuestionBase {
  questionType: 'essay'
  answerSpace: { lines: number }
}

// Posisi media relatif terhadap konten soal (semantic):
// above/below = media antara nomor+teks dan opsi/jawaban, bukan di luar block.
// top/bottom lama di-migrasi read-time menjadi above/below.
export type ImagePlacement = 'auto' | 'above' | 'below' | 'left' | 'right' | 'center' | 'inline'

export interface GalleryImage {
  id: string
  src: string
  caption: string
  alt: string
  order: number
}

export type GalleryLayout = 'auto' | 'grid' | 'horizontal' | 'vertical'

export type GalleryColumnPreset = 'auto' | 1 | 2 | 3 | 4 | 5 | 6

export type GalleryGap = 'small' | 'medium' | 'large'

// ImageGallery adalah child/media dari sebuah question. Block-nya berada di
// document.blocks dan terhubung via questionId (stable block ID), lalu
// dikelompokkan bersama question sebagai SATU atomic PageUnit saat pagination.
export interface ImageGalleryBlock {
  id: string
  type: 'image_gallery'
  questionId: string
  placement?: ImagePlacement
  layout: GalleryLayout
  columns: GalleryColumnPreset
  gap: GalleryGap
  width: ImageWidth
  images: GalleryImage[]
}

// Material: section materi sederhana (judul + isi). Content mempertahankan
// paragraf dan baris baru. Struktur siap diperluas dengan child blocks
// (heading/paragraph/image/table/callout) pada milestone berikutnya.
export interface MaterialBlock {
  id: string
  type: 'material'
  title: string
  content: string
}

export type ImageWidth = 'small' | 'medium' | 'large' | 'full'

export interface ImageBlock {
  id: string
  type: 'image'
  url: string
  alt: string
  caption: string
  source: 'upload' | 'ai'
  // Relation ke question memakai stable block ID, bukan nomor soal,
  // karena nomor bisa berubah saat block di-reorder/dihapus.
  questionId?: string
  placement?: ImagePlacement
  width?: ImageWidth
  // Data lama (milestone 2): before -> top, after -> bottom.
  // Tetap dipertahankan supaya localStorage lama tidak rusak.
  position?: 'before' | 'after'
}

export interface PageBreakBlock {
  id: string
  type: 'page_break'
}

export type QuestionBlock = MultipleChoiceQuestion | EssayQuestion

// Block types yang direncanakan di milestone berikutnya:
// table, activity, checklist, rubric, callout
export type Block =
  | HeadingBlock
  | TextBlock
  | MultipleChoiceQuestion
  | EssayQuestion
  | ImageBlock
  | ImageGalleryBlock
  | MaterialBlock
  | PageBreakBlock

export interface LKPDDocument {
  id: string
  metadata: LKPDMetadata
  templateId: string
  blocks: Block[]
  createdAt: string
  updatedAt: string
  // M4.5: kapan terakhir kali dibuat backup .lkpd (metadata, bukan isi konten).
  lastBackupAt?: string
  // M5.3.1 — background per halaman.
  // background        : default background dokumen (opsional). Jika tidak ada,
  //                      halaman mengikuti template (perilaku M1–M5.3).
  // pageBackgrounds   : override per halaman, key = nomor halaman ('1'..'N').
  //                      Halaman tanpa override memakai default dokumen/template.
  // customBackgrounds : daftar metadata background custom milik dokumen ini.
  //                      Blob asli disimpan di IndexedDB (object store images),
  //                      direferensikan via imageId — TIDAK ada base64 di sini.
  background?: PageBackgroundConfig
  pageBackgrounds?: Record<string, PageBackgroundConfig>
  customBackgrounds?: CustomBackgroundMeta[]
}

export const EMPTY_METADATA: LKPDMetadata = {
  title: '',
  subject: '',
  classLevel: '',
  major: '',
  semester: '',
  alokasiWaktu: '',
  schoolName: '',
  teacherName: '',
}
