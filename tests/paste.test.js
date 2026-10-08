import { describe, expect, it } from './runner.js'
import { parseStudentList } from '../js/data/paste.js'

describe('parseStudentList', () => {
  it('reads two columns copied from Excel: apellidos, nombres', () => {
    expect(parseStudentList('Pérez Gómez\tAna María\nRuiz\tLuis')).toEqual([
      { apellidos: 'Pérez Gómez', nombres: 'Ana María' },
      { apellidos: 'Ruiz', nombres: 'Luis' },
    ])
  })

  it('reads a third column as the document number', () => {
    expect(parseStudentList('Pérez Gómez\tAna María\t1065123456')).toEqual([{ apellidos: 'Pérez Gómez', nombres: 'Ana María', documento: '1065123456' }])
  })

  it('joins separate surname columns: primer apellido, segundo apellido, nombres', () => {
    expect(parseStudentList('Pérez\tGómez\tAna María\t1.065.123')).toEqual([{ apellidos: 'Pérez Gómez', nombres: 'Ana María', documento: '1.065.123' }])
    expect(parseStudentList('Pérez\tGómez\tAna\tMaría')).toEqual([{ apellidos: 'Pérez Gómez', nombres: 'Ana María' }])
  })

  it('splits "Apellidos, Nombres" at the comma', () => {
    expect(parseStudentList('Pérez Gómez, Ana María')).toEqual([{ apellidos: 'Pérez Gómez', nombres: 'Ana María' }])
  })

  it('takes the first two words as apellidos in a one-column list', () => {
    expect(parseStudentList('PÉREZ GÓMEZ ANA MARÍA')).toEqual([{ apellidos: 'PÉREZ GÓMEZ', nombres: 'ANA MARÍA' }])
    expect(parseStudentList('Pérez Ana')).toEqual([{ apellidos: 'Pérez', nombres: 'Ana' }])
  })

  it('skips blank lines, numbering and a header row', () => {
    const text = 'N°\tApellidos\tNombres\n\n1\tPérez\tAna\n2.\tRuiz\tLuis\n'
    expect(parseStudentList(text)).toEqual([
      { apellidos: 'Pérez', nombres: 'Ana' },
      { apellidos: 'Ruiz', nombres: 'Luis' },
    ])
  })

  it('collapses repeated spaces', () => {
    expect(parseStudentList('  Pérez   Gómez ,  Ana  ')).toEqual([{ apellidos: 'Pérez Gómez', nombres: 'Ana' }])
  })

  it('marks a line it cannot split', () => {
    expect(parseStudentList('Pérez')).toEqual([{ apellidos: 'Pérez', nombres: '', problem: 'Falta el nombre' }])
  })
})
