// Reads the sheets of an Excel .xlsx file into rows of cells, with no library:
// a .xlsx is a zip of XML files. The zip is opened with the browser's own
// DecompressionStream and the few XML files needed are read with plain text matching.

const BAD_FILE = 'Este archivo no es un archivo de Excel (.xlsx) que la app pueda leer.'

// ---------- Zip ----------

/** @returns {Map<string, Uint8Array | (() => Promise<Uint8Array>)>} path → bytes, inflated on demand */
function zipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0) throw new Error(BAD_FILE)
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const entries = new Map()
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error(BAD_FILE)
    const method = view.getUint16(at + 10, true)
    const size = view.getUint32(at + 20, true)
    const nameLength = view.getUint16(at + 28, true)
    const skip = nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true)
    const local = view.getUint32(at + 42, true)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const body = bytes.subarray(start, start + size)
    entries.set(name, method === 0 ? body : () => inflate(body))
    at += 46 + skip
  }
  return entries
}

async function inflate(body) {
  const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readText(entries, path) {
  const entry = entries.get(path)
  if (!entry) return null
  return new TextDecoder().decode(typeof entry === 'function' ? await entry() : entry)
}

// ---------- XML ----------

const unescape = (text) =>
  text.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[\da-f]+);/gi, (_, code) => {
    const named = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[code.toLowerCase()]
    if (named) return named
    return String.fromCodePoint(code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1)))
  })

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`))
  return match ? unescape(match[1]) : null
}

/** All the text inside <t> elements, leaving out phonetic guides (<rPh>). */
const textOf = (xml) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join('')

/** "C12" → 2 */
function columnIndex(ref) {
  let n = 0
  for (const ch of ref.match(/^[A-Z]+/)[0]) n = n * 26 + ch.charCodeAt(0) - 64
  return n - 1
}

function sheetRows(xml, shared) {
  const rows = []
  for (const [, rowTag, body = ''] of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(attr(rowTag, 'r')) || rows.length + 1
    const cells = []
    for (const [, cellTag, inner = ''] of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(cellTag, 'r')
      const col = ref ? columnIndex(ref) : cells.length
      const type = attr(cellTag, 't')
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let value = ''
      if (type === 's') value = shared[Number(v)] ?? ''
      else if (type === 'inlineStr') value = textOf(inner)
      else if (v != null) value = unescape(v)
      while (cells.length < col) cells.push('')
      cells[col] = value
    }
    while (rows.length < r - 1) rows.push([])
    rows[r - 1] = cells
  }
  return rows
}

// ---------- Workbook ----------

/** @returns {Promise<{ name: string, rows: string[][] }[]>} */
export async function readXlsx(bytes) {
  const entries = zipEntries(bytes)
  const workbook = await readText(entries, 'xl/workbook.xml')
  const rels = await readText(entries, 'xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new Error(BAD_FILE)

  const targets = new Map()
  for (const [tag] of rels.matchAll(/<Relationship\b[^>]*>/g)) targets.set(attr(tag, 'Id'), attr(tag, 'Target'))
  const sharedXml = await readText(entries, 'xl/sharedStrings.xml')
  const shared = sharedXml ? [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : []

  const sheets = []
  for (const [tag] of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const target = targets.get(tag.match(/\s[\w]+:id="([^"]*)"/)?.[1])
    if (!target) continue
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`
    const xml = await readText(entries, path)
    if (xml) sheets.push({ name: attr(tag, 'name') ?? '', rows: sheetRows(xml, shared) })
  }
  return sheets
}
