import { describe, expect, it } from './runner.js'
import { newDataFile, parseDataFile, serializeDataFile } from '../js/data/store.js'

describe('newDataFile', () => {
  it('starts a school year with no access set up and nothing recorded', () => {
    const data = newDataFile(2026)
    expect(data.settings.year).toBe(2026)
    expect(data.auth).toBeUndefined()
    expect(data.groups).toEqual([])
    expect(data.students).toEqual([])
    expect(data.grades).toEqual({})
    expect(data.objectives).toEqual({})
    expect(data.notes).toEqual({})
  })

  it('locks after 15 idle minutes by default', () => {
    expect(newDataFile(2026).settings.lockMinutes).toBe(15)
  })

  it("uses the school's 0 to 10 scale, always with one decimal", () => {
    const { settings } = newDataFile(2026)
    expect(settings.levels).toEqual([
      { name: 'Bajo', min: 0, max: 6.9 },
      { name: 'Básico', min: 7, max: 8.4 },
      { name: 'Alto', min: 8.5, max: 9.4 },
      { name: 'Superior', min: 9.5, max: 10 },
    ])
    expect(settings.decimals).toBeUndefined()
  })
})

describe('parseDataFile', () => {
  it('reads back what serializeDataFile wrote', () => {
    const data = newDataFile(2026)
    expect(parseDataFile(serializeDataFile(data))).toEqual(data)
  })

  it('rejects text that is not a data file', () => {
    expect(() => parseDataFile('lista de compras')).toThrow('no es un archivo de Notas NMA')
  })

  it('rejects JSON written by something else', () => {
    expect(() => parseDataFile('{"nombre":"otro programa"}')).toThrow('no es un archivo de Notas NMA')
  })

  it('accepts a file whose auth block was deleted, keeping its data', () => {
    const data = { ...newDataFile(2026), grades: { s1: { m1: [9, null, null, null] } } }
    const parsed = parseDataFile(serializeDataFile(data))
    expect(parsed.auth).toBeUndefined()
    expect(parsed.grades).toEqual(data.grades)
  })

  it('moves a file from the old 0 to 100 scale to 0 to 10', () => {
    const current = newDataFile(2026)
    const oldLevels = [
      { name: 'Bajo', min: 0, max: 59 },
      { name: 'Básico', min: 60, max: 79 },
      { name: 'Alto', min: 80, max: 94 },
      { name: 'Superior', min: 95, max: 100 },
    ]
    const old = { ...current, version: 1, settings: { ...current.settings, levels: oldLevels, decimals: true }, grades: { s1: { m1: [85, 72.5, null, 100] } } }
    const parsed = parseDataFile(JSON.stringify(old))
    expect(parsed.grades.s1.m1).toEqual([8.5, 7.3, null, 10])
    expect(parsed.settings.levels).toEqual(current.settings.levels)
    expect(parsed.settings.decimals).toBeUndefined()
    expect(parsed.version).toBe(current.version)
  })
})

describe('parseDataFile, older files', () => {
  it('joins apellidos and nombres into one name and drops the documento (version 2 files)', () => {
    const current = newDataFile(2026)
    const old = {
      ...current,
      version: 2,
      students: [
        { id: 's1', groupId: 'g1', apellidos: 'ROJAS MEJÍA', nombres: 'SARA', documento: '1065' },
        { id: 's2', groupId: 'g1', apellidos: 'Ruiz', nombres: 'Luis' },
      ],
    }
    const parsed = parseDataFile(JSON.stringify(old))
    expect(parsed.students).toEqual([
      { id: 's1', groupId: 'g1', nombre: 'ROJAS MEJÍA SARA' },
      { id: 's2', groupId: 'g1', nombre: 'Ruiz Luis' },
    ])
    expect(parsed.version).toBe(current.version)
  })

  it('converts a version 1 file all the way: scale and names', () => {
    const current = newDataFile(2026)
    const old = { ...current, version: 1, settings: { ...current.settings, decimals: false }, students: [{ id: 's1', groupId: 'g1', apellidos: 'Paz', nombres: 'Eva' }], grades: { s1: { m1: [90, null, null, null] } } }
    const parsed = parseDataFile(JSON.stringify(old))
    expect(parsed.students).toEqual([{ id: 's1', groupId: 'g1', nombre: 'Paz Eva' }])
    expect(parsed.grades.s1.m1).toEqual([9, null, null, null])
  })
})

describe('serializeDataFile', () => {
  it('writes indented text that is readable in Notepad', () => {
    expect(serializeDataFile(newDataFile(2026))).toContain('\n  "settings"')
  })
})
