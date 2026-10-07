import { describe, expect, it } from './runner.js'
import { formatWait, wrongMessage } from '../js/attempts.js'

describe('formatWait', () => {
  it('shows minutes and two-digit seconds', () => {
    expect(formatWait(28_000)).toBe('0:28')
    expect(formatWait(120_000)).toBe('2:00')
  })

  it('rounds a partial second up so it never shows 0:00 while still waiting', () => {
    expect(formatWait(400)).toBe('0:01')
  })
})

describe('wrongMessage', () => {
  it('only names the mistake while plenty of tries remain', () => {
    expect(wrongMessage('Contraseña incorrecta.', 4)).toBe('Contraseña incorrecta.')
  })

  it('counts down the last tries before a wait', () => {
    expect(wrongMessage('Contraseña incorrecta.', 2)).toBe('Contraseña incorrecta. Te quedan 2 intentos antes de tener que esperar.')
  })

  it('warns that the next mistake starts a wait', () => {
    expect(wrongMessage('Contraseña incorrecta.', 1)).toBe('Contraseña incorrecta. Si vuelves a fallar, tendrás que esperar 30 segundos.')
  })

  it('never says zero tries are left', () => {
    expect(wrongMessage('Contraseña incorrecta.', 0)).toBe('Contraseña incorrecta. Si vuelves a fallar, tendrás que esperar otra vez.')
  })
})
