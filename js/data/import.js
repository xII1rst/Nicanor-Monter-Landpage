// Brings a table (from a .csv, .txt or .xlsx) into the data: one row per student with
// Nombre, Grado and Curso, and one column per subject holding that period's notas.
//
// readImport() works out what would change without changing anything, so the app can
// show it first; applyImport() then adds it for the period the person picks.
// Groups, subjects and students are matched ignoring case, accents and extra spaces;
// whatever isn't found is created. An imported nota replaces the saved one for that
// period; an empty cell never erases a nota.

import { GRADE_LEVELS, addGroup, addStudent, addSubject, cleanName, gradeOf, groupName, newId, setGrade, setGroupSubjects } from './model.js'
import { formatGrade, parseGrade } from './grades.js'

/** "  Pérez   DÍAZ " → "perez diaz": for matching only. */
const key = (text) =>
  cleanName(String(text ?? ''))
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

// ---------- Header row ----------

// Columns that are neither the student nor a subject (headers compared without accents or signs).
const NOT_SUBJECTS = new Set(['n', 'no', 'nro', 'num', 'numero', 'item', 'prom', 'total', 'definitiva', 'nota definitiva', 'doc', 'puesto', 'fallas', 'inasistencias', 'jornada', 'sede', 'ano', 'periodo'])
const isNotSubject = (k) => NOT_SUBJECTS.has(k) || /promedio|desempeno|observacion|documento|identidad|identificacion/.test(k)

const isNameHeader = (k) => k.includes('nombre') || ['estudiante', 'estudiantes', 'alumno', 'alumnos'].includes(k)

/**
 * The first row (of the first 10) with the student's name, Grado and Curso.
 * A separate Apellidos column is joined in front of the name.
 */
function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const keys = rows[i].map(key)
    const nombre = keys.findIndex(isNameHeader)
    const apellidos = keys.findIndex((k) => k.includes('apellido') && !k.includes('nombre'))
    const grado = keys.indexOf('grado')
    const curso = keys.indexOf('curso')
    if (nombre < 0 || grado < 0 || curso < 0) continue
    const subjects = []
    rows[i].forEach((text, col) => {
      if ([nombre, apellidos, grado, curso].includes(col)) return
      const name = cleanName(String(text ?? ''))
      if (name && !isNotSubject(keys[col].replace(/[^a-z ]/g, '').trim())) subjects.push({ col, name })
    })
    return { row: i, nombre, apellidos, grado, curso, subjects }
  }
  return null
}

// ---------- Cells ----------

const WORDS = { primero: 1, primer: 1, segundo: 2, tercero: 3, tercer: 3, cuarto: 4, quinto: 5, sexto: 6, septimo: 7, setimo: 7, octavo: 8, noveno: 9, decimo: 10, undecimo: 11, once: 11 }
const ROMAN = { iii: 3, iv: 4, v: 5, vi: 6 }

/** "1", "1°", "Primero", "Transición", "CLEI 3", "Clei III" → { grade } of the app, or { error }. */
function readGrado(text) {
  const k = key(text).replace(/grado|[°º.]/g, '').replace(/\s/g, '')
  if (['transicion', '0', 'preescolar'].includes(k)) return { grade: GRADE_LEVELS[0] }
  const clei = k.match(/^clei(\d+|iii|iv|v|vi)$/)
  const ciclo = clei && (ROMAN[clei[1]] ?? Number(clei[1]))
  if (ciclo >= 3 && ciclo <= 6) return { grade: `CLEI ${ciclo}` }
  const n = /^\d+$/.test(k) ? Number(k) : WORDS[k]
  if (n >= 1 && n <= 5) return { grade: GRADE_LEVELS[n] }
  if (n >= 6 && n <= 11) return { error: `Grado "${text}": la secundaria va en CLEI 3 a 6.` }
  return { error: `Grado "${text}" no reconocido.` }
}

/** A number is written with two digits ("1" → "01"), as on the boletín; letters in capitals. */
const readCurso = (text) => {
  const clean = cleanName(String(text ?? '')).toUpperCase()
  return /^\d+$/.test(clean) ? String(Number(clean)).padStart(2, '0') : clean
}

/** A nota as typed in the app; Excel's 8.4000000000000004 counts as 8.4. */
function readNota(text) {
  let raw = String(text ?? '').trim()
  if (/^\d+\.\d{6,}$/.test(raw)) {
    const n = Number(raw)
    const rounded = Math.round(n * 10) / 10
    if (Math.abs(n - rounded) < 1e-6) raw = String(rounded)
  }
  return parseGrade(raw)
}

// ---------- Matching against the data ----------

const findGroup = (data, grade, section) => data.groups.find((g) => g.gradeLevel === grade && readCurso(g.section) === section)
const findSubject = (data, name) => data.subjects.find((s) => key(s.name) === key(name))
const findStudent = (data, groupId, nombre) => data.students.find((s) => s.groupId === groupId && key(s.nombre) === key(nombre))

// ---------- Preview ----------

/**
 * @param sheets [{ name, rows }] — name is null for .csv/.txt files
 * @returns what the import would add: groups, students, subjects, notas, problems
 */
export function readImport(data, sheets) {
  const problems = []
  const groups = new Map() // groupKey → { grade, section }
  const students = new Map() // groupKey|nameKey → { nombre, groupKey, notas: Map subjectKey → value }
  const subjects = new Map() // subjectKey → name as first written
  const withNotas = new Map() // groupKey → Set of subjectKeys
  let tables = 0

  for (const sheet of sheets) {
    const header = findHeader(sheet.rows)
    if (!header) continue
    tables++
    for (const { name } of header.subjects) if (!subjects.has(key(name))) subjects.set(key(name), name)

    for (let r = header.row + 1; r < sheet.rows.length; r++) {
      const row = sheet.rows[r]
      if (!row.some((c) => String(c ?? '').trim())) continue
      const where = sheet.name ? `${sheet.name}, fila ${r + 1}` : `Fila ${r + 1}`
      const problem = (message) => problems.push({ where, message })

      const surname = header.apellidos >= 0 ? `${row[header.apellidos] ?? ''} ` : ''
      const nombre = cleanName(surname + String(row[header.nombre] ?? ''))
      const gradoText = cleanName(String(row[header.grado] ?? ''))
      const grado = gradoText ? readGrado(gradoText) : {}
      const grade = grado.grade
      const section = readCurso(row[header.curso])
      if (!nombre) problem('Falta el nombre.')
      else if (!gradoText) problem('Falta el grado.')
      else if (grado.error) problem(grado.error)
      else if (!section) problem('Falta el curso.')
      if (!nombre || !grade || !section) continue

      const groupKey = `${grade}|${section}`
      groups.set(groupKey, { grade, section })
      const studentKey = `${groupKey}|${key(nombre)}`
      if (!students.has(studentKey)) students.set(studentKey, { nombre, groupKey, notas: new Map() })
      const student = students.get(studentKey)

      for (const { col, name } of header.subjects) {
        const text = String(row[col] ?? '').trim()
        if (!text) continue
        const result = readNota(text)
        if (result.error) {
          problem(`${name} "${text}": ${result.error}`)
          continue
        }
        const subjectKey = key(name)
        const earlier = student.notas.get(subjectKey)
        if (earlier != null && earlier !== result.value) {
          problem(`${student.nombre} ya tiene ${formatGrade(earlier)} en ${name}; se deja esa.`)
          continue
        }
        student.notas.set(subjectKey, result.value)
        if (!withNotas.has(groupKey)) withNotas.set(groupKey, new Set())
        withNotas.get(groupKey).add(subjectKey)
      }
    }
  }

  if (tables === 0) {
    throw new Error('No se encontró la fila de títulos. La tabla necesita las columnas Nombre, Grado y Curso, y una columna por asignatura con las notas.')
  }

  const used = new Set([...withNotas.values()].flatMap((set) => [...set]))
  const list = [...students.values()]
  const isNewStudent = (s) => {
    const { grade, section } = groups.get(s.groupKey)
    const group = findGroup(data, grade, section)
    return !group || !findStudent(data, group.id, s.nombre)
  }
  return {
    groups: [...groups.entries()].map(([groupKey, { grade, section }]) => ({
      name: groupName(grade, section),
      isNew: !findGroup(data, grade, section),
      students: list.filter((s) => s.groupKey === groupKey).length,
    })),
    students: { total: list.length, new: list.filter(isNewStudent).length },
    subjects: [...subjects.entries()].filter(([k]) => used.has(k)).map(([, name]) => ({ name, isNew: !findSubject(data, name) })),
    notes: list.reduce((n, s) => n + s.notas.size, 0),
    emptyColumns: [...subjects.entries()].filter(([k]) => !used.has(k)).map(([, name]) => name),
    problems,
    // For applyImport:
    plan: { groups, students: list, subjects, withNotas },
  }
}

/** How many notas already saved for `period` the import would change. */
export function replacedCount(data, preview, period) {
  let count = 0
  for (const s of preview.plan.students) {
    const { grade, section } = preview.plan.groups.get(s.groupKey)
    const group = findGroup(data, grade, section)
    const student = group && findStudent(data, group.id, s.nombre)
    if (!student) continue
    for (const [subjectKey, value] of s.notas) {
      const subject = findSubject(data, preview.plan.subjects.get(subjectKey))
      const saved = subject ? gradeOf(data, student.id, subject.id, period) : null
      if (saved != null && saved !== value) count++
    }
  }
  return count
}

/** Adds the import to the data for `period` (1–4; unused when there are no notas). */
export function applyImport(data, preview, period) {
  const { groups, students, subjects, withNotas } = preview.plan
  let next = data

  for (const { grade, section } of groups.values()) {
    if (!findGroup(next, grade, section)) next = addGroup(next, { grade, section })
  }
  for (const [subjectKey, name] of subjects) {
    const used = [...withNotas.values()].some((set) => set.has(subjectKey))
    if (used && !findSubject(next, name)) next = addSubject(next, { name })
  }
  for (const s of students) {
    const { grade, section } = groups.get(s.groupKey)
    const group = findGroup(next, grade, section)
    let student = findStudent(next, group.id, s.nombre)
    if (!student) {
      const id = newId()
      next = addStudent(next, group.id, { nombre: s.nombre }, id)
      student = { id }
    }
    for (const [subjectKey, value] of s.notas) next = setGrade(next, student.id, findSubject(next, subjects.get(subjectKey)).id, period, value)
  }
  for (const [groupKey, subjectKeys] of withNotas) {
    const { grade, section } = groups.get(groupKey)
    const group = findGroup(next, grade, section)
    const ids = [...subjectKeys].map((k) => findSubject(next, subjects.get(k)).id)
    next = setGroupSubjects(next, group.id, [...group.subjectIds, ...ids])
  }
  return next
}
