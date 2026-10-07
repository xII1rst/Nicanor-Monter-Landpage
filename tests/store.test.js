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
  })

  it('locks after 15 idle minutes by default', () => {
    expect(newDataFile(2026).settings.lockMinutes).toBe(15)
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
    const data = { ...newDataFile(2026), grades: { s1: { m1: [90, null, null, null] } } }
    const parsed = parseDataFile(serializeDataFile(data))
    expect(parsed.auth).toBeUndefined()
    expect(parsed.grades).toEqual(data.grades)
  })
})

describe('serializeDataFile', () => {
  it('writes indented text that is readable in Notepad', () => {
    expect(serializeDataFile(newDataFile(2026))).toContain('\n  "settings"')
  })
})
