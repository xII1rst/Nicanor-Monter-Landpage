import { describe, expect, it } from './runner.js'
import { newDataFile } from '../js/data/store.js'
import { addGroup, addStudent, addSubject, gradeOf, setGrade, setGroupSubjects, sortedGroups, studentsOf } from '../js/data/model.js'
import { applyImport, readImport, replacedCount } from '../js/data/import.js'

const sheet = (rows, name = null) => ({ name, rows })
const HEADER = ['Nombre', 'Grado', 'Curso', 'Matemáticas', 'Lengua Castellana']

/** Imports one table into `data` for `period` and returns the new data. */
const run = (data, rows, period = 1) => applyImport(data, readImport(data, [sheet(rows)]), period)

const names = (data) => sortedGroups(data).map((g) => `${g.name}: ${studentsOf(data, g.id).map((s) => s.nombre).join(', ')}`)
const subjectId = (data, name) => data.subjects.find((s) => s.name === name).id
const studentId = (data, nombre) => data.students.find((s) => s.nombre === nombre).id
const nota = (data, nombre, subject, period) => gradeOf(data, studentId(data, nombre), subjectId(data, subject), period)

describe('readImport: the header row', () => {
  it('finds the header under a title and takes the other columns as subjects', () => {
    const preview = readImport(newDataFile(2026), [
      sheet([
        ['Notas del primer periodo'],
        [],
        ['N°', 'NOMBRE COMPLETO', 'Grado', 'Curso', 'Matemáticas', 'T.I.', 'Promedio', 'Desempeño', 'Doc. Identidad', 'Observaciones'],
        ['1', 'ROJAS MEJÍA SARA', '1°', '01', '8,4', '8', '8,2', 'Alto', '1065', 'Bien'],
      ]),
    ])
    expect(preview.subjects).toEqual([
      { name: 'Matemáticas', isNew: true },
      { name: 'T.I.', isNew: true },
    ])
    expect(preview.notes).toBe(2)
  })

  it('joins separate Apellidos and Nombres columns into one name', () => {
    const data = run(newDataFile(2026), [
      ['Apellidos', 'Nombres', 'Grado', 'Curso', 'Matemáticas'],
      ['ROJAS MEJÍA', 'SARA', '1', '01', '8'],
    ])
    expect(names(data)).toEqual(['1°01: ROJAS MEJÍA SARA'])
    expect(data.subjects.map((s) => s.name)).toEqual(['Matemáticas'])
  })

  it('refuses a table without Nombre, Grado and Curso', () => {
    expect(() => readImport(newDataFile(2026), [sheet([['Estudiante', 'Nota'], ['Ana', '9']])])).toThrow('Nombre, Grado y Curso')
  })
})

describe('applyImport: a first table', () => {
  const rows = [HEADER, ['ROJAS MEJÍA SARA', '1°', '01', '8,4', '6,9'], ['PÉREZ DÍAZ LUIS', '1', '1', '9.5', ''], ['ÑAÑEZ PAZ EVA', 'Segundo', 'a', '10', '8']]

  it('creates the groups, students and subjects', () => {
    const data = run(newDataFile(2026), rows)
    expect(names(data)).toEqual(['1°01: PÉREZ DÍAZ LUIS, ROJAS MEJÍA SARA', '2°A: ÑAÑEZ PAZ EVA'])
    expect(data.subjects.map((s) => s.name)).toEqual(['Matemáticas', 'Lengua Castellana'])
  })

  it('stores the notas in the chosen period', () => {
    const data = run(newDataFile(2026), rows, 3)
    expect(nota(data, 'ROJAS MEJÍA SARA', 'Matemáticas', 3)).toBe(8.4)
    expect(nota(data, 'PÉREZ DÍAZ LUIS', 'Matemáticas', 3)).toBe(9.5)
    expect(nota(data, 'PÉREZ DÍAZ LUIS', 'Lengua Castellana', 3)).toBe(null)
    expect(nota(data, 'ROJAS MEJÍA SARA', 'Matemáticas', 1)).toBe(null)
  })

  it('gives each group the subjects of the table', () => {
    const data = run(newDataFile(2026), rows)
    expect(data.groups.map((g) => g.subjectIds.length)).toEqual([2, 2])
  })

  it('summarizes what it will add before adding it', () => {
    const preview = readImport(newDataFile(2026), [sheet(rows)])
    expect(preview.groups).toEqual([
      { name: '1°01', isNew: true, students: 2 },
      { name: '2°A', isNew: true, students: 1 },
    ])
    expect(preview.students).toEqual({ total: 3, new: 3 })
    expect(preview.notes).toBe(5)
    expect(preview.problems).toEqual([])
  })
})

describe('readImport: grado and curso', () => {
  it('understands the grado written as a number, with °, in words, or as a CLEI', () => {
    const data = run(newDataFile(2026), [
      ['Nombre', 'Grado', 'Curso'],
      ['A Uno', 'Transición', '01'],
      ['B Dos', 'primero', '01'],
      ['C Tres', '3º', '01'],
      ['D Cuatro', 'Quinto', '01'],
      ['E Cinco', 'clei iii', '01'],
      ['F Seis', 'CLEI 6', '01'],
      ['G Siete', 'Clei IV', '01'],
    ])
    expect(sortedGroups(data).map((g) => g.name)).toEqual(['Transición 01', '1°01', '3°01', '5°01', 'CLEI 3 01', 'CLEI 4 01', 'CLEI 6 01'])
  })

  it('points 6° to 11° to the CLEI of the sabatina', () => {
    const preview = readImport(newDataFile(2026), [sheet([['Nombre', 'Grado', 'Curso'], ['A Uno', '10', '01'], ['B Dos', 'Sexto', '01']], 'Hoja1')])
    expect(preview.problems.map((p) => p.message)).toEqual(['Grado "10": la secundaria va en CLEI 3 a 6.', 'Grado "Sexto": la secundaria va en CLEI 3 a 6.'])
  })

  it('writes a numeric curso with two digits, as the boletín does (Excel drops the zero)', () => {
    const data = run(newDataFile(2026), [
      ['Nombre', 'Grado', 'Curso'],
      ['A Uno', '1', '1'],
      ['B Dos', '1', '01'],
    ])
    expect(names(data)).toEqual(['1°01: A Uno, B Dos'])
  })
})

describe('applyImport: later tables', () => {
  const period1 = [HEADER, ['ROJAS MEJÍA SARA', '1°', '01', '8,4', '6,9'], ['PÉREZ DÍAZ LUIS', '1°', '01', '9,5', '7']]

  it('matches the same student in the next period, ignoring case, accents and spaces', () => {
    let data = run(newDataFile(2026), period1, 1)
    const preview = readImport(data, [sheet([HEADER, ['rojas  mejia sara', '1', '1', '8,4', '6,9'], ['PEREZ DIAZ LUIS', 'Primero', '01', '9', '7,5']])])
    expect(preview.students).toEqual({ total: 2, new: 0 })
    expect(preview.groups).toEqual([{ name: '1°01', isNew: false, students: 2 }])
    expect(preview.subjects.map((s) => s.isNew)).toEqual([false, false])
    data = applyImport(data, preview, 2)
    expect(data.students.length).toBe(2)
    expect(nota(data, 'PÉREZ DÍAZ LUIS', 'Matemáticas', 1)).toBe(9.5)
    expect(nota(data, 'PÉREZ DÍAZ LUIS', 'Matemáticas', 2)).toBe(9)
  })

  it('matches groups and subjects made by hand in the app', () => {
    let data = addGroup(newDataFile(2026), { grade: '1°', section: '01' }, 'g1')
    data = addSubject(data, { name: 'Matemáticas' }, 'mat')
    data = setGroupSubjects(data, 'g1', ['mat'])
    data = addStudent(data, 'g1', { nombre: 'Rojas Mejía Sara' }, 's1')
    data = run(data, [['Nombre', 'Grado', 'Curso', 'MATEMATICAS'], ['ROJAS MEJÍA SARA', '1', '1', '8']])
    expect(data.groups.length).toBe(1)
    expect(data.subjects.length).toBe(1)
    expect(gradeOf(data, 's1', 'mat', 1)).toBe(8)
  })

  it('replaces a nota already saved for that period, but an empty cell never erases one', () => {
    let data = run(newDataFile(2026), period1, 1)
    const preview = readImport(data, [sheet([HEADER, ['ROJAS MEJÍA SARA', '1', '01', '9', ''], ['PÉREZ DÍAZ LUIS', '1', '01', '9,5', '']])])
    expect(replacedCount(data, preview, 1)).toBe(1) // 8,4 → 9; 9,5 stays 9,5
    expect(replacedCount(data, preview, 2)).toBe(0)
    data = applyImport(data, preview, 1)
    expect(nota(data, 'ROJAS MEJÍA SARA', 'Matemáticas', 1)).toBe(9)
    expect(nota(data, 'ROJAS MEJÍA SARA', 'Lengua Castellana', 1)).toBe(6.9)
  })
})

describe('readImport: rows it cannot use', () => {
  const rows = [
    HEADER,
    ['ROJAS MEJÍA SARA', '1', '01', '8,45', '7'],
    ['', '1', '01', '9', ''],
    ['PÉREZ DÍAZ LUIS', '', '01', '9', ''],
    ['RUIZ PAZ ANA', 'Kínder', '01', '9', ''],
    ['CASTRO DÍAZ EVA', '1', '', '9', ''],
    ['DÍAZ RUIZ JUAN', '1', '01', '12', 'x'],
    ['', '', '', '', ''],
  ]

  it('lists each problem with its row and leaves the bad cell or row out', () => {
    const preview = readImport(newDataFile(2026), [sheet(rows, 'Hoja1')])
    expect(preview.problems.map((p) => `${p.where}: ${p.message}`)).toEqual([
      'Hoja1, fila 2: Matemáticas "8,45": Usa máximo un decimal.',
      'Hoja1, fila 3: Falta el nombre.',
      'Hoja1, fila 4: Falta el grado.',
      'Hoja1, fila 5: Grado "Kínder" no reconocido.',
      'Hoja1, fila 6: Falta el curso.',
      'Hoja1, fila 7: Matemáticas "12": La nota máxima es 10.',
      'Hoja1, fila 7: Lengua Castellana "x": Escribe una nota de 0 a 10.',
    ])
    expect(preview.students).toEqual({ total: 2, new: 2 })
    expect(preview.notes).toBe(1)
  })

  it('names the row without a sheet name for .csv files', () => {
    const preview = readImport(newDataFile(2026), [sheet([HEADER, ['', '1', '01', '9', '']])])
    expect(preview.problems[0].where).toBe('Fila 2')
  })
})

describe('readImport: notas from Excel', () => {
  it('rounds the tiny errors Excel leaves in numbers, but refuses two real decimals', () => {
    const data = run(newDataFile(2026), [HEADER, ['A Uno', '1', '01', '8.4000000000000004', '6.8999999999999995'], ['B Dos', '1', '01', '8.45', '']])
    expect(nota(data, 'A Uno', 'Matemáticas', 1)).toBe(8.4)
    expect(nota(data, 'A Uno', 'Lengua Castellana', 1)).toBe(6.9)
    expect(nota(data, 'B Dos', 'Matemáticas', 1)).toBe(null)
  })
})

describe('readImport: subjects per group', () => {
  it('only gives a group the subjects it has notas in, and leaves out columns with no notas', () => {
    const rows = [
      ['Nombre', 'Grado', 'Curso', 'Matemáticas', 'Física', 'Ética'],
      ['A Uno', '1', '01', '8', '', ''],
      ['B Dos', 'CLEI 5', '01', '7', '9', ''],
    ]
    const preview = readImport(newDataFile(2026), [sheet(rows)])
    expect(preview.emptyColumns).toEqual(['Ética'])
    const data = applyImport(newDataFile(2026), preview, 1)
    const subjectsOf = (name) => data.groups.find((g) => g.name === name).subjectIds.map((id) => data.subjects.find((s) => s.id === id).name)
    expect(subjectsOf('1°01')).toEqual(['Matemáticas'])
    expect(subjectsOf('CLEI 5 01')).toEqual(['Matemáticas', 'Física'])
    expect(data.subjects.map((s) => s.name)).toEqual(['Matemáticas', 'Física'])
  })

  it('keeps the subjects a group already had', () => {
    let data = addGroup(newDataFile(2026), { grade: '1°', section: '01' }, 'g1')
    data = addSubject(data, { name: 'Artística' }, 'art')
    data = setGroupSubjects(data, 'g1', ['art'])
    data = run(data, [['Nombre', 'Grado', 'Curso', 'Matemáticas'], ['A Uno', '1', '01', '8']])
    expect(data.groups[0].subjectIds.length).toBe(2)
  })
})

describe('readImport: several sheets', () => {
  it('joins a student found on two sheets (one per teacher)', () => {
    const preview = readImport(newDataFile(2026), [
      sheet([['Nombre', 'Grado', 'Curso', 'Matemáticas'], ['A Uno', '1', '01', '8']], 'Matemáticas'),
      sheet([['Nombre', 'Grado', 'Curso', 'Inglés'], ['A UNO', '1', '01', '9']], 'Inglés'),
      sheet([['Portada']], 'Portada'),
    ])
    expect(preview.students).toEqual({ total: 1, new: 1 })
    const data = applyImport(newDataFile(2026), preview, 1)
    expect(nota(data, 'A Uno', 'Matemáticas', 1)).toBe(8)
    expect(nota(data, 'A Uno', 'Inglés', 1)).toBe(9)
  })

  it('keeps the first of two different notas for the same student and subject, and says so', () => {
    const preview = readImport(newDataFile(2026), [
      sheet([['Nombre', 'Grado', 'Curso', 'Matemáticas'], ['A Uno', '1', '01', '8']], 'Hoja1'),
      sheet([['Nombre', 'Grado', 'Curso', 'Matemáticas'], ['A Uno', '1', '01', '9']], 'Hoja2'),
    ])
    expect(preview.problems.map((p) => `${p.where}: ${p.message}`)).toEqual(['Hoja2, fila 2: A Uno ya tiene 8,0 en Matemáticas; se deja esa.'])
    expect(nota(applyImport(newDataFile(2026), preview, 1), 'A Uno', 'Matemáticas', 1)).toBe(8)
  })
})

describe('readImport: a list without notas', () => {
  it('adds the students and groups, with nothing to put in a period', () => {
    const preview = readImport(newDataFile(2026), [sheet([['Nombre', 'Grado', 'Curso'], ['A Uno', '1', '01']])])
    expect(preview.notes).toBe(0)
    expect(preview.subjects).toEqual([])
    expect(names(applyImport(newDataFile(2026), preview, null))).toEqual(['1°01: A Uno'])
  })
})

describe('applyImport', () => {
  it('does not change the data it was given', () => {
    const before = setGrade(addStudent(addGroup(newDataFile(2026), { grade: '1°', section: '01' }, 'g1'), 'g1', { nombre: 'A Uno' }, 's1'), 's1', 'x', 1, 5)
    const copy = JSON.stringify(before)
    run(before, [HEADER, ['A Uno', '1', '01', '9', '9']])
    expect(JSON.stringify(before)).toBe(copy)
  })
})
