import { describe, expect, it } from './runner.js'
import { average, formatGrade, levelFor, levelsFromMins, parseGrade } from '../js/data/grades.js'

const levels = levelsFromMins({ basico: 60, alto: 80, superior: 95 }, false)

describe('parseGrade', () => {
  it('treats an empty cell as no grade yet', () => {
    expect(parseGrade('  ', { decimals: false })).toEqual({ value: null })
  })

  it('reads whole numbers from 0 to 100', () => {
    expect(parseGrade('0', { decimals: false })).toEqual({ value: 0 })
    expect(parseGrade(' 85 ', { decimals: false })).toEqual({ value: 85 })
    expect(parseGrade('100', { decimals: false })).toEqual({ value: 100 })
  })

  it('rejects grades above 100', () => {
    expect(parseGrade('101', { decimals: false }).error).toBe('La nota máxima es 100.')
  })

  it('rejects anything that is not a number', () => {
    expect(parseGrade('8a', { decimals: false }).error).toBe('Escribe un número de 0 a 100.')
    expect(parseGrade('-5', { decimals: false }).error).toBe('Escribe un número de 0 a 100.')
  })

  it('rejects decimals while they are turned off', () => {
    expect(parseGrade('85.5', { decimals: false }).error).toBe('Usa números enteros: los decimales están desactivados en Ajustes.')
  })

  it('accepts one decimal with a comma or a point when turned on', () => {
    expect(parseGrade('85,5', { decimals: true })).toEqual({ value: 85.5 })
    expect(parseGrade('85.5', { decimals: true })).toEqual({ value: 85.5 })
  })

  it('rejects more than one decimal', () => {
    expect(parseGrade('85,55', { decimals: true }).error).toBe('Usa máximo un decimal.')
  })
})

describe('levelFor', () => {
  it('maps each grade to its desempeño, inclusive at the lower bound', () => {
    expect(levelFor(0, levels)).toBe('Bajo')
    expect(levelFor(59, levels)).toBe('Bajo')
    expect(levelFor(60, levels)).toBe('Básico')
    expect(levelFor(94, levels)).toBe('Alto')
    expect(levelFor(95, levels)).toBe('Superior')
    expect(levelFor(100, levels)).toBe('Superior')
  })
})

describe('levelsFromMins', () => {
  it('builds contiguous ranges from the three minimums', () => {
    expect(levels).toEqual([
      { name: 'Bajo', min: 0, max: 59 },
      { name: 'Básico', min: 60, max: 79 },
      { name: 'Alto', min: 80, max: 94 },
      { name: 'Superior', min: 95, max: 100 },
    ])
  })

  it('ends each range one tenth below the next when decimals are on', () => {
    expect(levelsFromMins({ basico: 60, alto: 80, superior: 95 }, true)[0]).toEqual({ name: 'Bajo', min: 0, max: 59.9 })
  })

  it('rejects minimums that are not in increasing order', () => {
    expect(() => levelsFromMins({ basico: 80, alto: 80, superior: 95 }, false)).toThrow('de menor a mayor')
  })

  it('rejects minimums outside 1 to 100', () => {
    expect(() => levelsFromMins({ basico: 0, alto: 80, superior: 95 }, false)).toThrow('entre 1 y 100')
    expect(() => levelsFromMins({ basico: 60, alto: 80, superior: 101 }, false)).toThrow('entre 1 y 100')
  })
})

describe('average', () => {
  it('averages the grades that exist, to one decimal', () => {
    expect(average([80, 85, null, 90])).toBe(85)
    expect(average([80, 85])).toBe(82.5)
    expect(average([70, 71, 71])).toBe(70.7)
  })

  it('has no average when there are no grades', () => {
    expect(average([null, null])).toBe(null)
  })
})

describe('formatGrade', () => {
  it('shows nothing for a missing grade and uses a decimal comma', () => {
    expect(formatGrade(null)).toBe('')
    expect(formatGrade(85)).toBe('85')
    expect(formatGrade(85.5)).toBe('85,5')
  })
})
