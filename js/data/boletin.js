// Fills the school's boletín (templates/boletin.docx) for every student of a group:
// one page each, with the notas of periods 1 to N (later ones blank), the desempeño of
// period N, the group's objetivos for N as bullets, and the student's comportamiento
// and observaciones for N. The template holds placeholders like {nombre}; each student
// gets a copy of the whole page, with the subject row repeated once per subject.
import { levelFor } from './grades.js'
import { gradeInWords, gradeOf, groupSubjects, jornadaOf, noteOf, objectiveOf, studentsOf } from './model.js'
import { readZip, writeZip } from './zip.js'

export const boletinFileName = (group, period) => `Boletines ${group.name} - Periodo ${period}.docx`

/** One objetivo per line; a bullet typed at the start ("- ", "• ") is dropped, Word adds its own. */
const lines = (text) =>
  text
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*·]\s*/, '').trim())
    .filter(Boolean)

// The school's boletín writes notas with a dot: 8.4
const nota = (value) => (value == null ? '' : value.toFixed(1))

/** What goes on each student's page, in list order. */
export function boletinPages(data, groupId, period) {
  const group = data.groups.find((g) => g.id === groupId)
  const subjects = groupSubjects(data, group)
  return studentsOf(data, groupId).map((student) => ({
    nombre: student.nombre,
    jornada: jornadaOf(group.gradeLevel),
    grado: gradeInWords(group.gradeLevel),
    curso: group.section,
    periodo: String(period),
    anio: String(data.settings.year),
    subjects: subjects.map((subject) => {
      const current = gradeOf(data, student.id, subject.id, period)
      return {
        asignatura: subject.name.toLocaleUpperCase('es'),
        notas: [1, 2, 3, 4].map((p) => (p <= period ? nota(gradeOf(data, student.id, subject.id, p)) : '')),
        desempeno: current == null ? '' : levelFor(current, data.settings.levels),
        objetivos: lines(objectiveOf(data, groupId, subject.id, period)),
      }
    }),
    comportamiento: noteOf(data, student.id, 'comportamiento', period).trim(),
    observaciones: noteOf(data, student.id, 'observaciones', period).trim(),
  }))
}

/** "Superior 9.5-10.0" … "Bajo 0.0-6.9", from the desempeños in Ajustes. */
export const escalaTexts = (levels) => [...levels].reverse().map((l) => `${l.name} ${l.min.toFixed(1)}-${l.max.toFixed(1)}`)

// ---------- Filling the Word XML ----------

/** Text as Word XML: escaped, line breaks kept, and braces written so they can't be taken for placeholders. */
const asXml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .split('\n')
    .join('</w:t><w:br/><w:t xml:space="preserve">')

const fill = (xml, fields) => xml.replace(/\{(\w+)\}/g, (placeholder, name) => (name in fields ? asXml(fields[name]) : placeholder))

/** [start, end] of the <tag> element around `marker` (e.g. the <w:tr> holding {asignatura}). */
function around(xml, marker, tag) {
  const at = xml.indexOf(marker)
  const start = [...xml.slice(0, at).matchAll(new RegExp(`<${tag}[ >]`, 'g'))].at(-1).index
  return [start, xml.indexOf(`</${tag}>`, at) + tag.length + 3]
}

/** An empty text keeps its paragraph but not the bullet or dash in front of it. */
function dropBullet(xml, placeholder) {
  const [start, end] = around(xml, placeholder, 'w:p')
  return xml.slice(0, start) + xml.slice(start, end).replace(/<w:numPr>.*?<\/w:numPr>/s, '') + xml.slice(end)
}

function subjectRow(rowXml, s) {
  const [p1, p2, p3, p4] = s.notas
  const row = fill(rowXml, { asignatura: s.asignatura, p1, p2, p3, p4, desempeno: s.desempeno }) // {objetivo} stays
  const [start, end] = around(row, '{objetivo}', 'w:p')
  const bullet = row.slice(start, end)
  const bullets = s.objetivos.length > 0 ? s.objetivos.map((objetivo) => fill(bullet, { objetivo })).join('') : fill(dropBullet(bullet, '{objetivo}'), { objetivo: '' })
  return row.slice(0, start) + bullets + row.slice(end)
}

function fillPage(template, page, escala) {
  let body = template
  for (const name of ['comportamiento', 'observaciones']) if (!page[name] && body.includes(`{${name}}`)) body = dropBullet(body, `{${name}}`)
  const [start, end] = around(body, '{asignatura}', 'w:tr')
  const rows = page.subjects.map((s) => subjectRow(body.slice(start, end), s)).join('')
  const [escala1, escala2, escala3, escala4] = escala
  const fields = { ...page, escala1, escala2, escala3, escala4 }
  return fill(body.slice(0, start), fields) + rows + fill(body.slice(end), fields)
}

/** Ends a page with its own section (a copy of the document's), so the next student starts on a new page. */
function endSection(page, sectPr) {
  const last = [...page.matchAll(/<w:p[ >]/g)].at(-1).index
  const close = page.indexOf('</w:pPr>', last)
  return page.slice(0, close) + sectPr + page.slice(close)
}

/** document.xml of the template → the same with one page per student. */
export function fillDocument(xml, pages, escala) {
  const bodyStart = xml.indexOf('<w:body>') + '<w:body>'.length
  const sectStart = xml.lastIndexOf('<w:sectPr')
  const bodyEnd = xml.indexOf('</w:body>')
  const body = xml.slice(bodyStart, sectStart)
  const sectPr = xml.slice(sectStart, bodyEnd)
  const filled = pages.map((page, i) => {
    const xmlPage = fillPage(body, page, escala)
    return i < pages.length - 1 ? endSection(xmlPage, sectPr) : xmlPage
  })
  return xml.slice(0, bodyStart) + filled.join('') + xml.slice(sectStart)
}

/** The bytes of the .docx with every student's boletín for the group and period. */
export async function makeBoletines(templateBytes, data, groupId, period) {
  const files = []
  for (const [name, read] of readZip(templateBytes)) {
    let bytes = await read()
    if (name === 'word/document.xml') {
      const xml = fillDocument(new TextDecoder().decode(bytes), boletinPages(data, groupId, period), escalaTexts(data.settings.levels))
      bytes = new TextEncoder().encode(xml)
    }
    files.push({ name, bytes })
  }
  return writeZip(files)
}
