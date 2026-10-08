import { describe, expect, it } from './runner.js'
import { newDataFile } from '../js/data/store.js'
import { addGroup, addStudent, addSubject, setGrade, setGroupSubjects } from '../js/data/model.js'
import { missingGrades, rankGroup } from '../js/data/ranking.js'

// 6°A with two subjects and four students; grades[student] = [mat, len] for period 1.
function group(grades, period = 1) {
  let data = newDataFile(2026)
  data = addGroup(data, { grade: '6°', section: 'A' }, 'g')
  data = addSubject(data, { name: 'Matemáticas' }, 'mat')
  data = addSubject(data, { name: 'Lengua' }, 'len')
  data = setGroupSubjects(data, 'g', ['mat', 'len'])
  for (const [id, apellidos] of [['a', 'Arias'], ['b', 'Bravo'], ['c', 'Castro'], ['d', 'Díaz']]) {
    data = addStudent(data, 'g', { apellidos, nombres: 'X' }, id)
    const [mat, len] = grades[id] ?? [null, null]
    data = setGrade(data, id, 'mat', period, mat)
    data = setGrade(data, id, 'len', period, len)
  }
  return data
}

const summary = (ranking) => ranking.map((r) => `${r.student.apellidos} ${r.puesto} ${r.average}`)

describe('rankGroup', () => {
  it('ranks by the plain average of the period, highest first', () => {
    const data = group({ a: [70, 80], b: [90, 100], c: [80, 80], d: [60, 70] })
    expect(summary(rankGroup(data, 'g', 1))).toEqual(['Bravo 1 95', 'Castro 2 80', 'Arias 3 75', 'Díaz 4 65'])
  })

  it('gives tied students the same puesto and skips the next one (1, 2, 2, 4)', () => {
    const data = group({ a: [80, 80], b: [90, 100], c: [70, 90], d: [60, 70] })
    expect(summary(rankGroup(data, 'g', 1))).toEqual(['Bravo 1 95', 'Arias 2 80', 'Castro 2 80', 'Díaz 4 65'])
  })

  it('ranks by the average as shown, to one decimal', () => {
    // 85.25 and 85.3 both show as 85,3, so they tie.
    const data = group({ a: [85, 85.5], b: [85.1, 85.5], c: [50, 50], d: [40, 40] })
    expect(rankGroup(data, 'g', 1).map((r) => r.puesto)).toEqual([1, 1, 3, 4])
  })

  it('only looks at the period asked for', () => {
    const data = setGrade(group({ a: [100, 100], b: [50, 50], c: [60, 60], d: [70, 70] }), 'b', 'mat', 2, 100)
    expect(rankGroup(data, 'g', 2).map((r) => `${r.student.apellidos} ${r.puesto}`)).toEqual(['Bravo 1', 'Arias null', 'Castro null', 'Díaz null'])
  })

  it('lists students without any grade last, with no puesto', () => {
    const data = group({ a: [70, 70], c: [90, 90] })
    expect(summary(rankGroup(data, 'g', 1))).toEqual(['Castro 1 90', 'Arias 2 70', 'Bravo null null', 'Díaz null null'])
  })
})

describe('missingGrades', () => {
  it('lists, per student, the subjects still without a grade for the period', () => {
    const data = group({ a: [70, 80], b: [90, null], c: [null, null], d: [60, 70] })
    expect(missingGrades(data, 'g', 1).map((m) => `${m.student.apellidos}: ${m.subjects.map((s) => s.name).join(', ')}`)).toEqual([
      'Bravo: Lengua',
      'Castro: Matemáticas, Lengua',
    ])
  })

  it('is empty when the period is complete', () => {
    expect(missingGrades(group({ a: [1, 1], b: [1, 1], c: [1, 1], d: [1, 1] }), 'g', 1)).toEqual([])
  })
})
