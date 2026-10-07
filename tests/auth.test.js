import { describe, expect, it } from './runner.js'
import { afterFailure, codeErrors, hashSecret, lockoutMs, passwordErrors, setupErrors, verifySecret } from '../js/data/auth.js'

// Low iteration count keeps the suite fast; the stored record carries its own count.
const FAST = 1000

describe('hashSecret / verifySecret', () => {
  it('verifies the same secret it hashed', async () => {
    const stored = await hashSecret('clave-secreta', FAST)
    expect(await verifySecret('clave-secreta', stored)).toBe(true)
  })

  it('rejects a different secret', async () => {
    const stored = await hashSecret('clave-secreta', FAST)
    expect(await verifySecret('clave-secretA', stored)).toBe(false)
  })

  it('never stores the plain secret', async () => {
    const stored = await hashSecret('clave-secreta', FAST)
    expect(JSON.stringify(stored)).not.toContain('clave-secreta')
  })

  it('uses a fresh salt each time, so equal secrets give different hashes', async () => {
    const a = await hashSecret('clave-secreta', FAST)
    const b = await hashSecret('clave-secreta', FAST)
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('verifies using the iteration count stored with the hash', async () => {
    const stored = await hashSecret('clave-secreta', 2000)
    expect(stored.iterations).toBe(2000)
    expect(await verifySecret('clave-secreta', stored)).toBe(true)
  })
})

describe('lockoutMs', () => {
  it('allows the first four failures without waiting', () => {
    for (const failures of [0, 1, 2, 3, 4]) expect(lockoutMs(failures)).toBe(0)
  })

  it('waits 30 seconds after the fifth failure, doubling after each new one', () => {
    expect(lockoutMs(5)).toBe(30_000)
    expect(lockoutMs(6)).toBe(60_000)
    expect(lockoutMs(7)).toBe(120_000)
  })

  it('never waits more than 15 minutes', () => {
    expect(lockoutMs(20)).toBe(15 * 60_000)
  })
})

describe('afterFailure', () => {
  it('counts the failure without a wait while attempts remain', () => {
    expect(afterFailure({ failures: 3, until: 0 }, 1000)).toEqual({ failures: 4, until: 1000 })
  })

  it('sets the wait once the fifth failure happens', () => {
    expect(afterFailure({ failures: 4, until: 0 }, 1000)).toEqual({ failures: 5, until: 31_000 })
  })
})

describe('passwordErrors', () => {
  it('accepts a long enough password typed twice', () => {
    expect(passwordErrors('abcdef', 'abcdef')).toEqual({})
  })

  it('rejects passwords shorter than 6 characters', () => {
    expect(passwordErrors('abcde', 'abcde').password).toBe('Usa al menos 6 caracteres.')
  })

  it('rejects a repeat that does not match', () => {
    expect(passwordErrors('abcdef', 'abcdeg').passwordRepeat).toBe('No coincide con la contraseña.')
  })
})

describe('codeErrors', () => {
  it('accepts a long enough code typed twice that differs from the password', () => {
    expect(codeErrors('mi-codigo', 'mi-codigo', 'abcdef')).toEqual({})
  })

  it('rejects codes shorter than 6 characters', () => {
    expect(codeErrors('abc', 'abc', 'abcdef').code).toBe('Usa al menos 6 caracteres.')
  })

  it('rejects a code equal to the password', () => {
    expect(codeErrors('abcdef', 'abcdef', 'abcdef').code).toBe('Debe ser distinto de la contraseña.')
  })

  it('rejects a repeat that does not match', () => {
    expect(codeErrors('mi-codigo', 'mi-codigx', 'abcdef').codeRepeat).toBe('No coincide con el código.')
  })
})

describe('setupErrors', () => {
  const valid = { name: 'María Pérez', password: 'abcdef', passwordRepeat: 'abcdef', code: 'mi-codigo', codeRepeat: 'mi-codigo' }

  it('accepts a complete, valid setup', () => {
    expect(setupErrors(valid)).toEqual({})
  })

  it('requires a name that is not just spaces', () => {
    expect(setupErrors({ ...valid, name: '   ' }).name).toBe('Escribe tu nombre.')
  })

  it('reports password and code problems together', () => {
    const errors = setupErrors({ ...valid, passwordRepeat: 'x', codeRepeat: 'y' })
    expect(Object.keys(errors).sort()).toEqual(['codeRepeat', 'passwordRepeat'])
  })
})
