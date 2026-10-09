// Changes to the school data: groups, students, subjects and grades.
// Every function returns a new data object and never changes the one it gets,
// so the app can save exactly what it shows.

export const GRADE_LEVELS = ['Transición', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°']

const collator = new Intl.Collator('es', { sensitivity: 'base' })
export const newId = () => crypto.randomUUID().slice(0, 8)
const same = (a, b) => collator.compare(a, b) === 0

// ---------- Groups ----------

export const groupName = (grade, section) => (grade === 'Transición' ? `Transición ${section}`.trim() : `${grade}${section}`)

function groupFields(data, { grade, section }, exceptId) {
  const cleanSection = section.trim().toUpperCase()
  const name = groupName(grade, cleanSection)
  if (data.groups.some((g) => g.id !== exceptId && same(g.name, name))) throw new Error(`Ya existe el grupo ${name}.`)
  return { name, gradeLevel: grade, section: cleanSection }
}

export function addGroup(data, fields, id = newId()) {
  return { ...data, groups: [...data.groups, { id, ...groupFields(data, fields), subjectIds: [] }] }
}

export function updateGroup(data, id, fields) {
  const changes = groupFields(data, fields, id)
  return { ...data, groups: data.groups.map((g) => (g.id === id ? { ...g, ...changes } : g)) }
}

export function removeGroup(data, id) {
  if (data.students.some((s) => s.groupId === id)) throw new Error('Este grupo tiene estudiantes. Muévelos a otro grupo o elimínalos primero.')
  return { ...data, groups: data.groups.filter((g) => g.id !== id) }
}

export function sortedGroups(data) {
  return [...data.groups].sort(
    (a, b) => GRADE_LEVELS.indexOf(a.gradeLevel) - GRADE_LEVELS.indexOf(b.gradeLevel) || collator.compare(a.section ?? '', b.section ?? ''),
  )
}

/** Keeps the subjects in the order of the subject list (the boletín order). */
export function setGroupSubjects(data, groupId, subjectIds) {
  const ordered = data.subjects.filter((s) => subjectIds.includes(s.id)).map((s) => s.id)
  return { ...data, groups: data.groups.map((g) => (g.id === groupId ? { ...g, subjectIds: ordered } : g)) }
}

export const groupSubjects = (data, group) => group.subjectIds.map((id) => data.subjects.find((s) => s.id === id)).filter(Boolean)

// ---------- Students ----------

// Names are written surname first (ROJAS MEJÍA SARA), so this orders by apellidos.
export const compareStudents = (a, b) => collator.compare(a.nombre, b.nombre)

export const studentsOf = (data, groupId) => data.students.filter((s) => s.groupId === groupId).sort(compareStudents)

export const cleanName = (text) => text.replace(/\s+/g, ' ').trim()

function studentFields({ nombre }) {
  const clean = cleanName(nombre ?? '')
  if (!clean) throw new Error('Escribe el nombre del estudiante.')
  return { nombre: clean }
}

export function addStudent(data, groupId, fields, id = newId()) {
  return { ...data, students: [...data.students, { id, groupId, ...studentFields(fields) }] }
}

export function addStudents(data, groupId, list) {
  return list.reduce((acc, fields) => addStudent(acc, groupId, fields), data)
}

/** Edits a student; passing groupId moves them to another group (their grades go with them). */
export function updateStudent(data, id, fields) {
  return {
    ...data,
    students: data.students.map((s) => {
      if (s.id !== id) return s
      const merged = { ...s, ...fields }
      return { ...s, groupId: merged.groupId, ...studentFields(merged) }
    }),
  }
}

export function removeStudent(data, id) {
  const { [id]: _removed, ...grades } = data.grades
  return { ...data, students: data.students.filter((s) => s.id !== id), grades }
}

// ---------- Subjects ----------

function subjectFields(data, { name, area = '' }, exceptId) {
  const clean = { name: name.trim(), area: area.trim() }
  if (!clean.name) throw new Error('Escribe el nombre de la asignatura.')
  const twin = data.subjects.find((s) => s.id !== exceptId && same(s.name, clean.name))
  if (twin) throw new Error(`Ya existe la asignatura ${twin.name}.`)
  return clean
}

export function addSubject(data, fields, id = newId()) {
  return { ...data, subjects: [...data.subjects, { id, ...subjectFields(data, fields) }] }
}

export function updateSubject(data, id, fields) {
  const changes = subjectFields(data, fields, id)
  return { ...data, subjects: data.subjects.map((s) => (s.id === id ? { ...s, ...changes } : s)) }
}

/** Moves a subject one place up (-1) or down (+1); also reorders every group's subjects. */
export function moveSubject(data, id, delta) {
  const from = data.subjects.findIndex((s) => s.id === id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= data.subjects.length) return data
  const subjects = [...data.subjects]
  ;[subjects[from], subjects[to]] = [subjects[to], subjects[from]]
  const moved = { ...data, subjects }
  return data.groups.reduce((acc, g) => setGroupSubjects(acc, g.id, g.subjectIds), moved)
}

export function removeSubject(data, id) {
  const grades = Object.fromEntries(
    Object.entries(data.grades).map(([studentId, bySubject]) => {
      const { [id]: _removed, ...rest } = bySubject
      return [studentId, rest]
    }),
  )
  return {
    ...data,
    subjects: data.subjects.filter((s) => s.id !== id),
    groups: data.groups.map((g) => ({ ...g, subjectIds: g.subjectIds.filter((s) => s !== id) })),
    grades,
  }
}

// ---------- Grades (period 1–4) ----------

export const gradeOf = (data, studentId, subjectId, period) => data.grades[studentId]?.[subjectId]?.[period - 1] ?? null

export function setGrade(data, studentId, subjectId, period, value) {
  const bySubject = data.grades[studentId] ?? {}
  const periods = [...(bySubject[subjectId] ?? [null, null, null, null])]
  periods[period - 1] = value
  return { ...data, grades: { ...data.grades, [studentId]: { ...bySubject, [subjectId]: periods } } }
}

export function completion(data, groupId, period) {
  const group = data.groups.find((g) => g.id === groupId)
  const students = studentsOf(data, groupId)
  let filled = 0
  for (const s of students) for (const subjectId of group.subjectIds) if (gradeOf(data, s.id, subjectId, period) != null) filled++
  return { filled, total: students.length * group.subjectIds.length }
}
