import { describe, expect, it } from './runner.js'
import { newDataFile } from '../js/data/store.js'
import { addGroup, addStudent, addSubject, setGrade, setGroupSubjects, setObjective } from '../js/data/model.js'
import { missingGrades, missingObjectives } from '../js/data/missing.js'

// 1°A with two subjects and four students; grades[student] = [mat, len] for period 1.
function group(grades, period = 1) {
  let data = newDataFile(2026)
  data = addGroup(data, { grade: '1°', section: 'A' }, 'g')
  data = addSubject(data, { name: 'Matemáticas' }, 'mat')
  data = addSubject(data, { name: 'Lengua' }, 'len')
  data = setGroupSubjects(data, 'g', ['mat', 'len'])
  for (const [id, nombre] of [['a', 'Arias'], ['b', 'Bravo'], ['c', 'Castro'], ['d', 'Díaz']]) {
    data = addStudent(data, 'g', { nombre }, id)
    const [mat, len] = grades[id] ?? [null, null]
    data = setGrade(data, id, 'mat', period, mat)
    data = setGrade(data, id, 'len', period, len)
  }
  return data
}

describe('missingGrades', () => {
  it('lists, per student, the subjects still without a grade for the period', () => {
    const data = group({ a: [70, 80], b: [90, null], c: [null, null], d: [60, 70] })
    expect(missingGrades(data, 'g', 1).map((m) => `${m.student.nombre}: ${m.subjects.map((s) => s.name).join(', ')}`)).toEqual([
      'Bravo: Lengua',
      'Castro: Matemáticas, Lengua',
    ])
  })

  it('is empty when the period is complete', () => {
    expect(missingGrades(group({ a: [1, 1], b: [1, 1], c: [1, 1], d: [1, 1] }), 'g', 1)).toEqual([])
  })
})

describe('missingObjectives', () => {
  it('lists the subjects of the group with no objetivos for the period', () => {
    let data = setObjective(group({}), 'g', 'mat', 2, 'Suma y resta')
    data = setObjective(data, 'g', 'len', 2, '   ')
    expect(missingObjectives(data, 'g', 2).map((s) => s.name)).toEqual(['Lengua'])
    expect(missingObjectives(data, 'g', 1).map((s) => s.name)).toEqual(['Matemáticas', 'Lengua'])
  })
})
