// Logika seleksi soal hasil AI (M5.2). Murni & testable: array boolean
// berindeks sesuai urutan soal di preview.

export function initialSelection(count: number): boolean[] {
  return Array.from({ length: count }, () => true)
}

export function toggleAt(selection: boolean[], index: number): boolean[] {
  if (index < 0 || index >= selection.length) return selection
  const next = [...selection]
  next[index] = !next[index]
  return next
}

export function setAll(selection: boolean[], value: boolean): boolean[] {
  return selection.map(() => value)
}

export function countSelected(selection: boolean[]): number {
  return selection.reduce((total, selected) => total + (selected ? 1 : 0), 0)
}

export function allSelected(selection: boolean[]): boolean {
  return selection.length > 0 && selection.every((selected) => selected)
}
