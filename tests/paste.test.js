import { describe, expect, it } from './runner.js'
import { parseStudentList } from '../js/data/paste.js'

describe('parseStudentList', () => {
  it('takes one student per line, the whole line as the name', () => {
    expect(parseStudentList('ROJAS MEJÍA SARA\nPérez Díaz Ana María')).toEqual([{ nombre: 'ROJAS MEJÍA SARA' }, { nombre: 'Pérez Díaz Ana María' }])
  })

  it('joins cells copied from Excel into one name', () => {
    expect(parseStudentList('Pérez\tGómez\tAna María\nRuiz Díaz\tLuis')).toEqual([{ nombre: 'Pérez Gómez Ana María' }, { nombre: 'Ruiz Díaz Luis' }])
  })

  it('drops the comma of "Apellidos, Nombres"', () => {
    expect(parseStudentList('Pérez Gómez, Ana María')).toEqual([{ nombre: 'Pérez Gómez Ana María' }])
  })

  it('leaves out a document number', () => {
    expect(parseStudentList('Pérez Gómez Ana\t1065123456\nRuiz Díaz Luis 1.065.123')).toEqual([{ nombre: 'Pérez Gómez Ana' }, { nombre: 'Ruiz Díaz Luis' }])
  })

  it('skips blank lines, numbering and a header row', () => {
    const text = 'N°\tNombre\n\n1\tPérez Gómez Ana\n2.\tRuiz Díaz Luis\n3) Castro Paz Eva\n'
    expect(parseStudentList(text)).toEqual([{ nombre: 'Pérez Gómez Ana' }, { nombre: 'Ruiz Díaz Luis' }, { nombre: 'Castro Paz Eva' }])
  })

  it('collapses repeated spaces', () => {
    expect(parseStudentList('  Pérez   Gómez    Ana  ')).toEqual([{ nombre: 'Pérez Gómez Ana' }])
  })

  it('marks a line with a single word, which is not a full name', () => {
    expect(parseStudentList('Pérez')).toEqual([{ nombre: 'Pérez', problem: 'Falta el apellido o el nombre' }])
  })
})
