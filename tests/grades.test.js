import { describe, expect, it } from './runner.js'
import { average, formatGrade, levelFor, levelsFromMins, parseGrade } from '../js/data/grades.js'

const levels = levelsFromMins({ basico: 7, alto: 8.5, superior: 9.5 })

describe('parseGrade', () => {
  it('treats an empty cell as no grade yet', () => {
    expect(parseGrade('  ')).toEqual({ value: null })
  })

  it('reads grades from 0 to 10', () => {
    expect(parseGrade('0')).toEqual({ value: 0 })
    expect(parseGrade(' 8 ')).toEqual({ value: 8 })
    expect(parseGrade('10')).toEqual({ value: 10 })
  })

  it('accepts one decimal with a comma or a point', () => {
    expect(parseGrade('8,4')).toEqual({ value: 8.4 })
    expect(parseGrade('9.5')).toEqual({ value: 9.5 })
  })

  it('rejects grades above 10, including grades typed on the old 0 to 100 scale', () => {
    expect(parseGrade('10,5').error).toBe('La nota máxima es 10.')
    expect(parseGrade('85').error).toBe('La nota máxima es 10.')
  })

  it('rejects anything that is not a number', () => {
    expect(parseGrade('8a').error).toBe('Escribe una nota de 0 a 10.')
    expect(parseGrade('-5').error).toBe('Escribe una nota de 0 a 10.')
  })

  it('rejects more than one decimal', () => {
    expect(parseGrade('8,45').error).toBe('Usa máximo un decimal.')
  })
})

describe('levelFor', () => {
  it('maps each grade to its desempeño, inclusive at the lower bound', () => {
    expect(levelFor(0, levels)).toBe('Bajo')
    expect(levelFor(6.9, levels)).toBe('Bajo')
    expect(levelFor(7, levels)).toBe('Básico')
    expect(levelFor(8.4, levels)).toBe('Básico')
    expect(levelFor(8.5, levels)).toBe('Alto')
    expect(levelFor(9.4, levels)).toBe('Alto')
    expect(levelFor(9.5, levels)).toBe('Superior')
    expect(levelFor(10, levels)).toBe('Superior')
  })
})

describe('levelsFromMins', () => {
  it('builds contiguous ranges, each ending one tenth below the next', () => {
    expect(levels).toEqual([
      { name: 'Bajo', min: 0, max: 6.9 },
      { name: 'Básico', min: 7, max: 8.4 },
      { name: 'Alto', min: 8.5, max: 9.4 },
      { name: 'Superior', min: 9.5, max: 10 },
    ])
  })

  it('rejects minimums that are not in increasing order', () => {
    expect(() => levelsFromMins({ basico: 8.5, alto: 8.5, superior: 9.5 })).toThrow('de menor a mayor')
  })

  it('rejects minimums outside 0,1 to 10', () => {
    expect(() => levelsFromMins({ basico: 0, alto: 8.5, superior: 9.5 })).toThrow('entre 0,1 y 10')
    expect(() => levelsFromMins({ basico: 7, alto: 8.5, superior: 10.5 })).toThrow('entre 0,1 y 10')
  })

  it('rejects minimums with more than one decimal', () => {
    expect(() => levelsFromMins({ basico: 7, alto: 8.55, superior: 9.5 })).toThrow('un decimal')
  })
})

describe('average', () => {
  it('averages the grades that exist, to one decimal', () => {
    expect(average([8, 8.5, null, 9])).toBe(8.5)
    expect(average([8, 8.5])).toBe(8.3)
    expect(average([7, 7.1, 7.1])).toBe(7.1)
  })

  it('has no average when there are no grades', () => {
    expect(average([null, null])).toBe(null)
  })
})

describe('formatGrade', () => {
  it('shows nothing for a missing grade', () => {
    expect(formatGrade(null)).toBe('')
  })

  it('always shows one decimal, with a decimal comma', () => {
    expect(formatGrade(8)).toBe('8,0')
    expect(formatGrade(8.4)).toBe('8,4')
    expect(formatGrade(10)).toBe('10,0')
  })
})
