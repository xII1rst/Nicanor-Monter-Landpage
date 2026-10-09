// Reads a table saved as text (.csv or .txt) into rows of cells.
// Handles what Excel and teachers produce: comma, semicolon or tab between cells,
// quoted cells, UTF-8 or the Windows-1252 that Spanish Excel uses for "CSV".

/** UTF-8 when the bytes are valid UTF-8 (the usual case), else Windows-1252. */
export function decodeText(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Splits text into rows of cells. Quoted cells may hold the separator, quotes ("") and line breaks. */
export function parseDelimited(text, separator) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell === '') {
      quoted = true
    } else if (ch === separator) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) rows.push([...row, cell])
  return rows
}

/**
 * Picks the separator from the header row (the first line that mentions "grado"),
 * so a title above the table doesn't mislead it. Tabs win; otherwise semicolons win
 * ties, since Spanish Excel separates with ";" when commas are decimal points.
 */
export function detectSeparator(text) {
  const lines = text.split(/\r?\n/).slice(0, 20)
  const header = lines.find((l) => /grado/i.test(l)) ?? lines.find((l) => l.trim()) ?? ''
  const count = (sep) => header.split(sep).length - 1
  if (count('\t') > 0) return '\t'
  return count(';') >= count(',') && count(';') > 0 ? ';' : ','
}
