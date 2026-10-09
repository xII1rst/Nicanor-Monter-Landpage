import { describe, expect, it } from './runner.js'
import { decodeText, detectSeparator, parseDelimited, readTextTable } from '../js/data/table.js'

const utf8 = (text) => new TextEncoder().encode(text)

describe('decodeText', () => {
  it('reads UTF-8, with or without the mark Excel puts at the start', () => {
    expect(decodeText(utf8('Matemáticas'))).toBe('Matemáticas')
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('Año')]))).toBe('Año')
  })

  it('reads Windows-1252, the "CSV" that Spanish Excel saves', () => {
    // "Matemáticas;NUÑEZ" in Windows-1252: á = E1, Ñ = D1
    const bytes = new Uint8Array([0x4d, 0x61, 0x74, 0x65, 0x6d, 0xe1, 0x74, 0x69, 0x63, 0x61, 0x73, 0x3b, 0x4e, 0x55, 0xd1, 0x45, 0x5a])
    expect(decodeText(bytes)).toBe('Matemáticas;NUÑEZ')
  })
})

describe('parseDelimited', () => {
  it('splits lines into cells', () => {
    expect(parseDelimited('a;b\nc;d', ';')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('handles Windows line endings and a last empty line', () => {
    expect(parseDelimited('a,b\r\nc,d\r\n', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('reads quoted cells with separators, quotes and line breaks inside', () => {
    expect(parseDelimited('"8,4","DÍAZ, ANA","dice ""hola"""\n"dos\nlíneas",x', ',')).toEqual([
      ['8,4', 'DÍAZ, ANA', 'dice "hola"'],
      ['dos\nlíneas', 'x'],
    ])
  })

  it('keeps empty cells in their place', () => {
    expect(parseDelimited('a;;c;', ';')).toEqual([['a', '', 'c', '']])
  })
})

describe('detectSeparator', () => {
  it('finds semicolons even when notas use a decimal comma', () => {
    expect(detectSeparator('Nombre;Grado;Curso;Matemáticas\nSARA;1°;01;8,4')).toBe(';')
  })

  it('finds commas', () => {
    expect(detectSeparator('Nombre,Grado,Curso\nSARA,1,01')).toBe(',')
  })

  it('prefers tabs (text copied or exported from Excel)', () => {
    expect(detectSeparator('Nombre\tGrado\tCurso\nPÉREZ, ANA\t1\t01')).toBe('\t')
  })

  it('looks at the header row, not at a title above it', () => {
    expect(detectSeparator('Notas, periodo 3, sede central\nNombre;Grado;Curso\n')).toBe(';')
  })
})

describe('readTextTable', () => {
  it('turns the bytes of a .csv or .txt into rows', () => {
    const bytes = utf8('﻿Nombre;Grado;Curso;Matemáticas\r\nROJAS MEJÍA SARA;1°;01;8,4\r\n')
    expect(readTextTable(bytes)).toEqual([
      ['Nombre', 'Grado', 'Curso', 'Matemáticas'],
      ['ROJAS MEJÍA SARA', '1°', '01', '8,4'],
    ])
  })
})
