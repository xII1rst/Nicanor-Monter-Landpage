// What is still missing before making a group's boletines for a period.
import { gradeOf, groupSubjects, objectiveOf, studentsOf } from './model.js'

/** Students with subjects still missing a grade for the period (to warn before making boletines). */
export function missingGrades(data, groupId, period) {
  const group = data.groups.find((g) => g.id === groupId)
  const subjects = groupSubjects(data, group)
  return studentsOf(data, groupId)
    .map((student) => ({ student, subjects: subjects.filter((s) => gradeOf(data, student.id, s.id, period) == null) }))
    .filter((m) => m.subjects.length > 0)
}

/** Subjects of the group with no objetivos typed for the period. */
export function missingObjectives(data, groupId, period) {
  const group = data.groups.find((g) => g.id === groupId)
  return groupSubjects(data, group).filter((s) => !objectiveOf(data, groupId, s.id, period).trim())
}
