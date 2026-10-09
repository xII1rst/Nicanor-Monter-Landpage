import { describe, expect, it } from './runner.js'
import { newDataFile } from '../js/data/store.js'
import { addGroup, addStudent, addSubject, setGrade, setGroupSubjects, setNote, setObjective } from '../js/data/model.js'
import { boletinFileName, boletinPages, escalaTexts, fillDocument, makeBoletines } from '../js/data/boletin.js'
import { readZip, writeZip } from '../js/data/zip.js'

function sample() {
  let data = newDataFile(2026)
  data = addGroup(data, { grade: '1°', section: '01' }, 'g')
  data = addSubject(data, { name: 'Matemáticas' }, 'mat')
  data = addSubject(data, { name: 'Lengua Castellana' }, 'len')
  data = setGroupSubjects(data, 'g', ['mat', 'len'])
  data = addStudent(data, 'g', { nombre: 'ROJAS MEJÍA SARA' }, 's1')
  data = addStudent(data, 'g', { nombre: 'ARIAS PAZ ANA' }, 's2')
  for (const [p, v] of [[1, 8.4], [2, 8], [3, 9.5], [4, 7]]) data = setGrade(data, 's1', 'mat', p, v)
  data = setGrade(data, 's1', 'len', 3, 6.9)
  data = setObjective(data, 'g', 'mat', 3, '- Suma\n\n• Resta  ')
  data = setNote(data, 's1', 'comportamiento', 3, 'Buena convivencia')
  data = setNote(data, 's1', 'observaciones', 3, 'Lee más\ncada día')
  return data
}

// The same shape as templates/boletin.docx, reduced to its placeholders.
const TEMPLATE =
  '<w:document><w:body>' +
  '<w:tbl><w:tr><w:tc><w:p><w:r><w:t xml:space="preserve">{nombre}</w:t></w:r></w:p></w:tc>' +
  '<w:tc><w:p><w:r><w:t xml:space="preserve">{jornada}|{grado}|{curso}|{periodo}|{anio}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' +
  '<w:tbl><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:p><w:r><w:t xml:space="preserve">{asignatura}</w:t></w:r></w:p></w:tc>' +
  '<w:tc><w:p><w:r><w:t xml:space="preserve">{p1}|{p2}|{p3}|{p4}|{desempeno}</w:t></w:r></w:p></w:tc>' +
  '<w:tc><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">{objetivo}</w:t></w:r></w:p></w:tc></w:tr>' +
  '<w:tr><w:tc><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">{comportamiento}</w:t></w:r></w:p>' +
  '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">{observaciones}</w:t></w:r></w:p></w:tc></w:tr>' +
  '<w:tr><w:tc><w:p><w:r><w:t xml:space="preserve">{escala1};{escala2};{escala3};{escala4}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' +
  '<w:p><w:pPr><w:spacing w:line="20"/></w:pPr></w:p>' +
  '<w:sectPr><w:pgSz w:w="12240" w:h="18720"/></w:sectPr></w:body></w:document>'

const count = (text, part) => text.split(part).length - 1
const fill = (data) => fillDocument(TEMPLATE, boletinPages(data, 'g', 3), escalaTexts(data.settings.levels))

describe('boletinPages', () => {
  it('makes one page per student, in list order', () => {
    expect(boletinPages(sample(), 'g', 3).map((p) => p.nombre)).toEqual(['ARIAS PAZ ANA', 'ROJAS MEJÍA SARA'])
  })

  it('fills the header from the group and the school year', () => {
    const { jornada, grado, curso, periodo, anio } = boletinPages(sample(), 'g', 3)[1]
    expect([jornada, grado, curso, periodo, anio]).toEqual(['Única', 'Primero', '01', '3', '2026'])
    const clei = addGroup(sample(), { grade: 'CLEI 3', section: '01' }, 'c')
    const page = boletinPages(addStudent(clei, 'c', { nombre: 'A Uno' }), 'c', 1)[0]
    expect([page.jornada, page.grado]).toEqual(['Sabatina', 'CLEI 3'])
  })

  it('lists each subject in capitals with the notas up to the period, its desempeño and objetivos', () => {
    const [mat, len] = boletinPages(sample(), 'g', 3)[1].subjects
    expect(mat).toEqual({ asignatura: 'MATEMÁTICAS', notas: ['8.4', '8.0', '9.5', ''], desempeno: 'Superior', objetivos: ['Suma', 'Resta'] })
    expect(len).toEqual({ asignatura: 'LENGUA CASTELLANA', notas: ['', '', '6.9', ''], desempeno: 'Bajo', objetivos: [] })
  })

  it('leaves the desempeño blank when the period has no nota', () => {
    const [mat] = boletinPages(sample(), 'g', 3)[0].subjects
    expect(mat.notas).toEqual(['', '', '', ''])
    expect(mat.desempeno).toBe('')
  })

  it('carries the comportamiento and observaciones of the period', () => {
    const page = boletinPages(sample(), 'g', 3)[1]
    expect([page.comportamiento, page.observaciones]).toEqual(['Buena convivencia', 'Lee más\ncada día'])
    expect(boletinPages(sample(), 'g', 2)[1].comportamiento).toBe('')
  })
})

describe('escalaTexts', () => {
  it('writes the desempeños from Superior down, as on the boletín', () => {
    expect(escalaTexts(newDataFile(2026).settings.levels)).toEqual(['Superior 9.5-10.0', 'Alto 8.5-9.4', 'Básico 7.0-8.4', 'Bajo 0.0-6.9'])
  })
})

describe('fillDocument', () => {
  it('puts each student on a page of their own, each ending its own section', () => {
    const xml = fill(sample())
    expect(xml.indexOf('ARIAS PAZ ANA') < xml.indexOf('ROJAS MEJÍA SARA')).toBe(true)
    expect(count(xml, '<w:sectPr>')).toBe(2)
    expect(xml).toContain('<w:spacing w:line="20"/><w:sectPr>')
    expect(xml.endsWith('<w:sectPr><w:pgSz w:w="12240" w:h="18720"/></w:sectPr></w:body></w:document>')).toBe(true)
  })

  it('repeats the subject row per subject, with a bullet per objetivo', () => {
    const xml = fill(sample())
    expect(xml).toContain('MATEMÁTICAS')
    expect(xml).toContain('8.4|8.0|9.5||Superior')
    expect(xml).toContain('||6.9||Bajo')
    expect(count(xml, '<w:numId w:val="3"/>')).toBe(4) // Suma and Resta on both pages; Lengua has none
    expect(xml).not.toContain('{')
  })

  it('fills the escala, comportamiento and observaciones, with line breaks', () => {
    const xml = fill(sample())
    expect(xml).toContain('Superior 9.5-10.0;Alto 8.5-9.4;Básico 7.0-8.4;Bajo 0.0-6.9')
    expect(xml).toContain('Buena convivencia')
    expect(xml).toContain('Lee más</w:t><w:br/><w:t xml:space="preserve">cada día')
  })

  it('writes typed text as text: & < > and braces stay what they are', () => {
    let data = addStudent(sample(), 'g', { nombre: 'PAZ & <ROJAS> LUZ' }, 's3')
    data = setNote(data, 's3', 'comportamiento', 3, 'Escribió {nombre}')
    const xml = fill(data)
    expect(xml).toContain('PAZ &amp; &lt;ROJAS&gt; LUZ')
    expect(xml).toContain('Escribió &#123;nombre}')
  })
})

describe('fillDocument, empty texts', () => {
  it('drops the dash in front of an empty comportamiento or observaciones', () => {
    const xml = fill(sample())
    // Sara has both texts (2 dashes); Ana has neither (0).
    expect(count(xml, '<w:numId w:val="5"/>')).toBe(2)
  })
})

describe('makeBoletines', () => {
  it('returns the template with the document filled and every other file as it was', async () => {
    const utf8 = (text) => new TextEncoder().encode(text)
    const template = await writeZip([
      { name: '[Content_Types].xml', bytes: utf8('<Types/>') },
      { name: 'word/document.xml', bytes: utf8(TEMPLATE) },
    ])
    const entries = readZip(await makeBoletines(template, sample(), 'g', 3))
    const read = async (name) => new TextDecoder().decode(await entries.get(name)())
    expect(await read('[Content_Types].xml')).toBe('<Types/>')
    expect(await read('word/document.xml')).toContain('ROJAS MEJÍA SARA')
  })

  it('names the file after the group and period', () => {
    expect(boletinFileName({ name: '1°01' }, 3)).toBe('Boletines 1°01 - Periodo 3.docx')
  })
})
