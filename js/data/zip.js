// Reads and writes zip files (.xlsx and .docx are zips of XML files) with the browser's
// own DecompressionStream and CompressionStream, so no library is needed and it works offline.

const NOT_A_ZIP = 'El archivo no es un .zip válido.'

/** @returns {Map<string, () => Promise<Uint8Array>>} path → contents, unpacked when asked, in the zip's order */
export function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0) throw new Error(NOT_A_ZIP)
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const entries = new Map()
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error(NOT_A_ZIP)
    const method = view.getUint16(at + 10, true)
    const size = view.getUint32(at + 20, true)
    const nameLength = view.getUint16(at + 28, true)
    const skip = nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true)
    const local = view.getUint32(at + 42, true)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const body = bytes.subarray(start, start + size)
    entries.set(name, method === 0 ? async () => body : () => transform(body, new DecompressionStream('deflate-raw')))
    at += 46 + skip
  }
  return entries
}

async function transform(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

export function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1 // 1 Jan 2026; Word doesn't look at it

/** files: [{ name, bytes }] → the bytes of a .zip (compressed where it helps) */
export async function writeZip(files) {
  const encoder = new TextEncoder()
  const parts = []
  const directory = []
  let offset = 0
  for (const { name, bytes } of files) {
    const nameBytes = encoder.encode(name)
    const deflated = await transform(bytes, new CompressionStream('deflate-raw'))
    const method = deflated.length < bytes.length ? 8 : 0
    const body = method === 8 ? deflated : bytes
    const fields = (view, at) => {
      view.setUint16(at, 20, true) // version needed
      view.setUint16(at + 2, 0x0800, true) // names in UTF-8
      view.setUint16(at + 4, method, true)
      view.setUint16(at + 8, DOS_DATE, true)
      view.setUint32(at + 10, crc32(bytes), true)
      view.setUint32(at + 14, body.length, true)
      view.setUint32(at + 18, bytes.length, true)
      view.setUint16(at + 22, nameBytes.length, true)
    }
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    fields(local, 4)
    parts.push(new Uint8Array(local.buffer), nameBytes, body)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true) // made by
    fields(entry, 6)
    entry.setUint32(42, offset, true)
    directory.push(new Uint8Array(entry.buffer), nameBytes)
    offset += 30 + nameBytes.length + body.length
  }
  const size = directory.reduce((n, part) => n + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, size, true)
  end.setUint32(16, offset, true)
  return new Uint8Array(await new Blob([...parts, ...directory, new Uint8Array(end.buffer)]).arrayBuffer())
}
