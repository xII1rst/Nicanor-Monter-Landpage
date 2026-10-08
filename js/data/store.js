// Shape of the data file (one per school year). It is plain JSON text so it
// stays readable in Notepad; only the password and recovery code are hashed.
//
// {
//   app: 'notas-nma', version: 1,
//   settings: { schoolName, year, levels: [{ name, min, max }], decimals, lockMinutes },
//   auth?:    { name, password: SecretHash, recovery: SecretHash },
//   groups:   [{ id, name, gradeLevel, section, subjectIds }],   (subjectIds in boletín order)
//   subjects: [{ id, name, area }],
//   students: [{ id, groupId, apellidos, nombres, documento? }],
//   grades:   { [studentId]: { [subjectId]: [p1, p2, p3, p4] } }   (null = not entered yet)
// }

export function newDataFile(year) {
  return {
    app: 'notas-nma',
    version: 1,
    settings: {
      schoolName: 'Institución Educativa Nicanor Montero Arias',
      year,
      // Placeholder cut-offs until the school confirms its SIEE (plan.md, Q3).
      levels: [
        { name: 'Bajo', min: 0, max: 59 },
        { name: 'Básico', min: 60, max: 79 },
        { name: 'Alto', min: 80, max: 94 },
        { name: 'Superior', min: 95, max: 100 },
      ],
      decimals: false,
      lockMinutes: 15,
    },
    groups: [],
    subjects: [],
    students: [],
    grades: {},
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
  return data
}
