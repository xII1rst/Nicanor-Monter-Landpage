// Puesto: each student's place in their group for one period, by the plain average
// of that period's grades (as shown, one decimal). Ties share the puesto and the next
// one skips (1, 2, 2, 4). Students with no grades in the period get no puesto.
// Calculated only when making the boletín, once the period's grades are in.
import { average } from './grades.js'
import { compareStudents, gradeOf, groupSubjects, studentsOf } from './model.js'

export function rankGroup(data, groupId, period) {
  const group = data.groups.find((g) => g.id === groupId)
  const subjects = groupSubjects(data, group)
  const rows = studentsOf(data, groupId).map((student) => ({
    student,
    average: average(subjects.map((s) => gradeOf(data, student.id, s.id, period))),
  }))
  const ranked = rows.filter((r) => r.average != null).sort((a, b) => b.average - a.average || compareStudents(a.student, b.student))
  const unranked = rows.filter((r) => r.average == null)
  return [
    ...ranked.map((r) => ({ ...r, puesto: 1 + ranked.filter((other) => other.average > r.average).length })),
    ...unranked.map((r) => ({ ...r, puesto: null })),
  ]
}

/** Students with subjects still missing a grade for the period (to warn before making boletines). */
export function missingGrades(data, groupId, period) {
  const group = data.groups.find((g) => g.id === groupId)
  const subjects = groupSubjects(data, group)
  return studentsOf(data, groupId)
    .map((student) => ({ student, subjects: subjects.filter((s) => gradeOf(data, student.id, s.id, period) == null) }))
    .filter((m) => m.subjects.length > 0)
}
