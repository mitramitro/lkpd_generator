// Sanitasi nama file ekspor .lkpd. Mengganti karakter ilegal Windows dengan
// '-', menciutkan spasi/jeda berulang, serta menghapus titik di awal/akhir
// (Windows menolak titik di akhir nama).
const ILLEGAL_CHARS = /[<>:"/\\|?*]/g

// Ganti karakter kontrol (0x00-0x1F) dengan '-'. Ditulis manual (bukan
// character class) agar lolos aturan lint no-control-regex.
function replaceControlChars(value: string): string {
  let result = ''
  for (const char of value) {
    result += char.charCodeAt(0) < 0x20 ? '-' : char
  }
  return result
}

export function sanitizeFilename(title: string): string {
  const cleaned = replaceControlChars(title)
    .replace(ILLEGAL_CHARS, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '')
    .trim()
  return cleaned || 'LKPD'
}

export function lkpdFilenameForTitle(title: string): string {
  return `${sanitizeFilename(title)}.lkpd`
}
