// Reads the sheets of an Excel .xlsx file into rows of cells, with no library:
// a .xlsx is a zip of XML files (see zip.js); the few XML files needed are read
// with plain text matching.
import { readZip } from './zip.js'

const BAD_FILE = 'Este archivo no es un archivo de Excel (.xlsx) que la app pueda leer.'

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
  let entries
  try {
    entries = readZip(bytes)
  } catch {
    throw new Error(BAD_FILE)
  }
  const readText = async (path) => (entries.has(path) ? new TextDecoder().decode(await entries.get(path)()) : null)
  const workbook = await readText('xl/workbook.xml')
  const rels = await readText('xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new Error(BAD_FILE)

  const targets = new Map()
  for (const [tag] of rels.matchAll(/<Relationship\b[^>]*>/g)) targets.set(attr(tag, 'Id'), attr(tag, 'Target'))
  const sharedXml = await readText('xl/sharedStrings.xml')
  const shared = sharedXml ? [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : []

  const sheets = []
  for (const [tag] of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const target = targets.get(tag.match(/\s[\w]+:id="([^"]*)"/)?.[1])
    if (!target) continue
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`
    const xml = await readText(path)
    if (xml) sheets.push({ name: attr(tag, 'name') ?? '', rows: sheetRows(xml, shared) })
  }
  return sheets
}
