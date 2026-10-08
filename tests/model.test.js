import { describe, expect, it } from './runner.js'
import { newDataFile } from '../js/data/store.js'
import {
  addGroup,
  addStudent,
  addStudents,
  addSubject,
  completion,
  gradeOf,
  hasDecimalGrades,
  moveSubject,
  removeGroup,
  removeStudent,
  removeSubject,
  setGrade,
  setGroupSubjects,
  sortedGroups,
  studentsOf,
  updateGroup,
  updateStudent,
} from '../js/data/model.js'

function sample() {
  let data = newDataFile(2026)
  data = addGroup(data, { grade: '6°', section: 'A' }, 'g6a')
  data = addSubject(data, { name: 'Matemáticas', area: 'Matemáticas' }, 'mat')
  data = addSubject(data, { name: 'Lengua Castellana', area: 'Humanidades' }, 'len')
  data = setGroupSubjects(data, 'g6a', ['mat', 'len'])
  data = addStudent(data, 'g6a', { apellidos: 'Zapata Ruiz', nombres: 'Ana' }, 's1')
  data = addStudent(data, 'g6a', { apellidos: 'Álvarez Díaz', nombres: 'Luis' }, 's2')
  return data
}

describe('groups', () => {
  it('names a group from its grade and section', () => {
    const data = addGroup(newDataFile(2026), { grade: '6°', section: 'a' }, 'x')
    expect(data.groups[0].name).toBe('6°A')
    expect(addGroup(newDataFile(2026), { grade: 'Transición', section: 'B' }, 'x').groups[0].name).toBe('Transición B')
  })

  it('refuses two groups with the same name', () => {
    expect(() => addGroup(sample(), { grade: '6°', section: 'A' })).toThrow('Ya existe el grupo 6°A.')
  })

  it('lists groups by grade, then section', () => {
    let data = newDataFile(2026)
    data = addGroup(data, { grade: '10°', section: 'A' }, 'a')
    data = addGroup(data, { grade: '6°', section: 'B' }, 'b')
    data = addGroup(data, { grade: '6°', section: 'A' }, 'c')
    data = addGroup(data, { grade: 'Transición', section: '' }, 'd')
    expect(sortedGroups(data).map((g) => g.name)).toEqual(['Transición', '6°A', '6°B', '10°A'])
  })

  it('renames a group', () => {
    expect(updateGroup(sample(), 'g6a', { grade: '7°', section: 'A' }).groups[0].name).toBe('7°A')
  })

  it('will not delete a group that still has students', () => {
    expect(() => removeGroup(sample(), 'g6a')).toThrow('Este grupo tiene estudiantes')
  })

  it('deletes an empty group', () => {
    const data = addGroup(newDataFile(2026), { grade: '6°', section: 'A' }, 'x')
    expect(removeGroup(data, 'x').groups).toEqual([])
  })

  it('keeps a group’s subjects in the order of the subject list', () => {
    expect(setGroupSubjects(sample(), 'g6a', ['len', 'mat']).groups[0].subjectIds).toEqual(['mat', 'len'])
  })
})

describe('students', () => {
  it('lists a group’s students alphabetically by apellidos, accents included', () => {
    expect(studentsOf(sample(), 'g6a').map((s) => s.apellidos)).toEqual(['Álvarez Díaz', 'Zapata Ruiz'])
  })

  it('sorts ñ after n, as in Spanish', () => {
    let data = sample()
    data = addStudent(data, 'g6a', { apellidos: 'Ñañez Paz', nombres: 'Eva' }, 's3')
    data = addStudent(data, 'g6a', { apellidos: 'Nuñez Paz', nombres: 'Juan' }, 's4')
    expect(studentsOf(data, 'g6a').map((s) => s.apellidos)).toEqual(['Álvarez Díaz', 'Nuñez Paz', 'Ñañez Paz', 'Zapata Ruiz'])
  })

  it('trims names and requires apellidos and nombres', () => {
    const data = addStudent(sample(), 'g6a', { apellidos: '  Pérez  ', nombres: ' Sofía ', documento: ' 1065 ' }, 's9')
    expect(data.students.at(-1)).toEqual({ id: 's9', groupId: 'g6a', apellidos: 'Pérez', nombres: 'Sofía', documento: '1065' })
    expect(() => addStudent(sample(), 'g6a', { apellidos: 'Pérez', nombres: ' ' })).toThrow('Escribe apellidos y nombres.')
  })

  it('adds a pasted list at once', () => {
    const data = addStudents(sample(), 'g6a', [
      { apellidos: 'Bravo', nombres: 'Uno' },
      { apellidos: 'Castro', nombres: 'Dos' },
    ])
    expect(studentsOf(data, 'g6a').length).toBe(4)
  })

  it('moves a student to another group by editing it', () => {
    let data = addGroup(sample(), { grade: '6°', section: 'B' }, 'g6b')
    data = updateStudent(data, 's1', { groupId: 'g6b' })
    expect(studentsOf(data, 'g6b').map((s) => s.id)).toEqual(['s1'])
  })

  it('deletes a student together with their grades', () => {
    let data = setGrade(sample(), 's1', 'mat', 1, 90)
    data = removeStudent(data, 's1')
    expect(data.students.map((s) => s.id)).toEqual(['s2'])
    expect(data.grades.s1).toBeUndefined()
  })
})

describe('subjects', () => {
  it('refuses two subjects with the same name, ignoring case and accents', () => {
    expect(() => addSubject(sample(), { name: 'matematicas', area: '' })).toThrow('Ya existe la asignatura')
  })

  it('moves a subject up or down the list', () => {
    expect(moveSubject(sample(), 'len', -1).subjects.map((s) => s.id)).toEqual(['len', 'mat'])
    expect(moveSubject(sample(), 'mat', -1).subjects.map((s) => s.id)).toEqual(['mat', 'len'])
  })

  it('deleting a subject removes it from groups and grades', () => {
    let data = setGrade(sample(), 's1', 'mat', 1, 90)
    data = removeSubject(data, 'mat')
    expect(data.groups[0].subjectIds).toEqual(['len'])
    expect(data.grades.s1.mat).toBeUndefined()
  })
})

describe('grades', () => {
  it('stores a grade per period and reads it back', () => {
    const data = setGrade(sample(), 's1', 'mat', 2, 88)
    expect(gradeOf(data, 's1', 'mat', 2)).toBe(88)
    expect(data.grades.s1.mat).toEqual([null, 88, null, null])
    expect(gradeOf(data, 's1', 'mat', 1)).toBe(null)
  })

  it('clears a grade', () => {
    let data = setGrade(sample(), 's1', 'mat', 1, 88)
    data = setGrade(data, 's1', 'mat', 1, null)
    expect(gradeOf(data, 's1', 'mat', 1)).toBe(null)
  })

  it('does not change the data it was given', () => {
    const before = sample()
    setGrade(before, 's1', 'mat', 1, 88)
    expect(gradeOf(before, 's1', 'mat', 1)).toBe(null)
  })

  it('counts how many grades a group has for a period', () => {
    let data = setGrade(sample(), 's1', 'mat', 1, 88)
    data = setGrade(data, 's2', 'len', 1, 70)
    data = setGrade(data, 's2', 'len', 2, 70)
    expect(completion(data, 'g6a', 1)).toEqual({ filled: 2, total: 4 })
  })

  it('knows when any grade has decimals', () => {
    expect(hasDecimalGrades(setGrade(sample(), 's1', 'mat', 1, 88))).toBe(false)
    expect(hasDecimalGrades(setGrade(sample(), 's1', 'mat', 1, 88.5))).toBe(true)
  })
})
