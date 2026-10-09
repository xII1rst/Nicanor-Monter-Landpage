// Turns a list pasted from Excel (or typed) into students: one student per line,
// the whole line is the name (cells on a line are joined with a space).
// Blank lines, a header row, list numbers and document numbers are skipped.
// The app shows a preview before adding anything, so an odd line can be caught there.

const clean = (s) => s.replace(/\s+/g, ' ').trim()
const isDocument = (s) => /^[\d.\- ]{5,}$/.test(s)
const isNumbering = (s) => /^\d{1,3}[.)°]?$/.test(s)
const isHeader = (cells) => cells.some((c) => /apellido|nombre/i.test(c))

function student(words) {
  const nombre = words.join(' ')
  return words.length > 1 ? { nombre } : { nombre, problem: 'Falta el apellido o el nombre' }
}

export function parseStudentList(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('\t').map(clean).filter((c) => c && !isDocument(c))
    if (cells.length === 0 || isHeader(cells)) continue
    const words = cells.join(' ').replace(/,/g, ' ').split(' ').filter(Boolean)
    if (words.length > 1 && isNumbering(words[0])) words.shift()
    if (words.length > 1 && isDocument(words.at(-1))) words.pop()
    rows.push(student(words))
  }
  return rows
}
