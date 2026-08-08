let cachedPxPerMm: number | null = null

// Konversi px -> mm yang konsisten dengan CSS print layout.
// Mengukur lebar elemen 100mm secara nyata di browser (bukan asumsi 96dpi),
// sehingga hasil pagination konsisten antara layar dan cetak.
export function pxPerMm(): number {
  if (cachedPxPerMm !== null) return cachedPxPerMm

  const probe = document.createElement('div')
  probe.style.width = '100mm'
  probe.style.position = 'absolute'
  probe.style.left = '-10000px'
  probe.style.top = '0'
  probe.style.visibility = 'hidden'
  document.body.appendChild(probe)
  const px = probe.getBoundingClientRect().width
  probe.remove()

  cachedPxPerMm = px / 100
  return cachedPxPerMm
}
