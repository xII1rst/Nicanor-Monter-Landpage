// Turns a list pasted from Excel (or typed) into students. Understands:
//   Apellidos <tab> Nombres [<tab> Documento]
//   Primer apellido <tab> Segundo apellido <tab> Nombres [<tab> Documento]
//   Apellidos, Nombres
//   APELLIDO APELLIDO NOMBRES   (one column: first two words are the apellidos)
// Blank lines, a header row and list numbers are skipped. The app shows a preview
// before adding anything, so an odd split can be caught there.

const clean = (s) => s.replace(/\s+/g, ' ').trim()
const isDocument = (s) => /^[\d.\- ]{5,}$/.test(s)
const isNumbering = (s) => /^\d{1,3}[.)°]?$/.test(s)
const isHeader = (cells) => cells.some((c) => /apellido|nombre/i.test(c))

function person(apellidos, nombres, documento) {
  const row = { apellidos, nombres }
  if (!nombres) row.problem = 'Falta el nombre'
  if (documento) row.documento = documento
  return row
}

function fromCells(cells) {
  const documento = cells.length > 2 && isDocument(cells.at(-1)) ? cells.pop() : undefined
  if (cells.length === 2) return person(cells[0], cells[1], documento)
  return person(`${cells[0]} ${cells[1]}`, cells.slice(2).join(' '), documento)
}

function fromOneCell(cell) {
  const comma = cell.indexOf(',')
  if (comma >= 0) return person(clean(cell.slice(0, comma)), clean(cell.slice(comma + 1)))
  const words = cell.split(' ')
  if (words.length > 1 && isNumbering(words[0])) words.shift()
  const documento = words.length > 2 && isDocument(words.at(-1)) ? words.pop() : undefined
  const cut = words.length >= 3 ? 2 : 1
  return person(words.slice(0, cut).join(' '), words.slice(cut).join(' '), documento)
}

export function parseStudentList(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    let cells = line.split('\t').map(clean).filter(Boolean)
    if (cells.length === 0 || isHeader(cells)) continue
    if (cells.length > 1 && isNumbering(cells[0])) cells = cells.slice(1)
    rows.push(cells.length === 1 ? fromOneCell(cells[0]) : fromCells(cells))
  }
  return rows
}
