// Shape of the data file (one per school year). It is plain JSON text so it
// stays readable in Notepad; only the password and recovery code are hashed.
//
// {
//   app: 'notas-nma', version: 3,
//   settings: { schoolName, year, levels: [{ name, min, max }], lockMinutes },
//   auth?:    { name, password: SecretHash, recovery: SecretHash },
//   groups:   [{ id, name, gradeLevel, section, subjectIds }],   (subjectIds in boletín order)
//   subjects: [{ id, name, area }],
//   students: [{ id, groupId, nombre }],                        (one name, surname first)
//   grades:   { [studentId]: { [subjectId]: [p1, p2, p3, p4] } }   (0.0 to 10.0; null = not entered yet)
//   objectives: { [groupId]: { [subjectId]: [p1, p2, p3, p4] } }  (text, one objetivo per line)
//   notes:    { [studentId]: { comportamiento: [p1..p4], observaciones: [p1..p4] } }   (text)
// }
// objectives and notes may be missing in older files; they read as empty.
// Older files are converted when opened: version 1 used a 0 to 100 scale,
// versions 1 and 2 split the name into apellidos and nombres (plus documento).

export function newDataFile(year) {
  return {
    app: 'notas-nma',
    version: 3,
    settings: {
      schoolName: 'Institución Educativa Nicanor Montero Arias',
      year,
      // The school's scale, from its boletín.
      levels: [
        { name: 'Bajo', min: 0, max: 6.9 },
        { name: 'Básico', min: 7, max: 8.4 },
        { name: 'Alto', min: 8.5, max: 9.4 },
        { name: 'Superior', min: 9.5, max: 10 },
      ],
      lockMinutes: 15,
    },
    groups: [],
    subjects: [],
    students: [],
    grades: {},
    objectives: {},
    notes: {},
  }
}

export function serializeDataFile(data) {
  return JSON.stringify(data, null, 2)
}

export function parseDataFile(text) {
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    // Not JSON: handled below.
  }
  if (!data || typeof data !== 'object' || data.app !== 'notas-nma') {
    throw new Error('Este archivo no es un archivo de Notas NMA.')
  }
  const v2 = data.version === 1 ? fromHundredScale(data) : data
  return v2.version === 2 ? fromSplitNames(v2) : v2
}

/** { apellidos: 'ROJAS MEJÍA', nombres: 'SARA' } → { nombre: 'ROJAS MEJÍA SARA' }; the documento goes. */
function fromSplitNames(data) {
  const students = data.students.map(({ apellidos = '', nombres = '', documento: _dropped, ...rest }) => ({
    ...rest,
    nombre: `${apellidos} ${nombres}`.replace(/\s+/g, ' ').trim(),
  }))
  return { ...data, version: 3, students }
}

/** 85 → 8.5 (rounded to one decimal), with the school's default desempeños. */
function fromHundredScale(data) {
  const { decimals, ...settings } = data.settings
  const grades = Object.fromEntries(
    Object.entries(data.grades).map(([studentId, bySubject]) => [
      studentId,
      Object.fromEntries(Object.entries(bySubject).map(([subjectId, periods]) => [subjectId, periods.map((v) => (v == null ? null : Math.round(v) / 10))])),
    ]),
  )
  return { ...data, version: 2, settings: { ...settings, levels: newDataFile(data.settings.year).settings.levels }, grades }
}
