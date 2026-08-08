// ZIP writer minimal (store, tanpa kompresi) — cukup untuk backup .lkpd
// tanpa dependency. Format: local file headers + central directory + EOCD,
// nama file UTF-8 (general purpose bit flag 0x0800).

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

export function createZipBytes(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array<ArrayBuffer>[] = []
  const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encodeUtf8(entry.name)
    const crc = crc32(entry.data)
    const local = new Uint8Array(30 + nameBytes.length + entry.data.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, entry.data.length, true)
    view.setUint32(22, entry.data.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    local.set(entry.data, 30 + nameBytes.length)
    parts.push(local)
    central.push({ name: nameBytes, crc, size: entry.data.length, offset })
    offset += local.length
  }

  const centralStart = offset
  for (const item of central) {
    const header = new Uint8Array(46 + item.name.length)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0x0800, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint16(14, 0, true)
    view.setUint32(16, item.crc, true)
    view.setUint32(20, item.size, true)
    view.setUint32(24, item.size, true)
    view.setUint16(28, item.name.length, true)
    view.setUint16(30, 0, true)
    view.setUint16(32, 0, true)
    view.setUint16(34, 0, true)
    view.setUint16(36, 0, true)
    view.setUint32(38, 0, true)
    view.setUint32(42, item.offset, true)
    header.set(item.name, 46)
    parts.push(header)
    offset += header.length
  }

  const centralSize = offset - centralStart
  const eocd = new Uint8Array(22)
  const view = new DataView(eocd.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, entries.length, true)
  view.setUint16(10, entries.length, true)
  view.setUint32(12, centralSize, true)
  view.setUint32(16, centralStart, true)
  view.setUint16(20, 0, true)
  parts.push(eocd)

  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    output.set(part, cursor)
    cursor += part.length
  }
  return output
}

export function createZipBlob(entries: ZipEntry[]): Blob {
  return new Blob([createZipBytes(entries)], { type: 'application/zip' })
}
