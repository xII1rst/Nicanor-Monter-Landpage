// Password and recovery-code handling. Both are stored only as salted
// PBKDF2-SHA-256 hashes, computed with the browser's built-in Web Crypto.

/** @typedef {{ hash: string, salt: string, iterations: number }} SecretHash */
/** @typedef {{ failures: number, until: number }} Attempts */

export const PBKDF2_ITERATIONS = 310_000
export const MIN_SECRET_LENGTH = 6
export const FREE_ATTEMPTS = 4

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

async function derive(secret, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

/** @returns {Promise<SecretHash>} */
export async function hashSecret(secret, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(secret, salt, iterations)
  return { hash: toBase64(hash), salt: toBase64(salt), iterations }
}

/** @param {SecretHash} stored */
export async function verifySecret(secret, stored) {
  const hash = await derive(secret, fromBase64(stored.salt), stored.iterations)
  return toBase64(hash) === stored.hash
}

/** Wait imposed after `failures` consecutive wrong attempts: none for the first four, then 30 s doubling, capped at 15 min. */
export function lockoutMs(failures) {
  if (failures <= FREE_ATTEMPTS) return 0
  return Math.min(30_000 * 2 ** (failures - FREE_ATTEMPTS - 1), 15 * 60_000)
}

/** @param {Attempts} attempts @returns {Attempts} */
export function afterFailure(attempts, now) {
  const failures = attempts.failures + 1
  return { failures, until: now + lockoutMs(failures) }
}

export function passwordErrors(password, passwordRepeat) {
  const errors = {}
  if (password.length < MIN_SECRET_LENGTH) errors.password = `Usa al menos ${MIN_SECRET_LENGTH} caracteres.`
  else if (password !== passwordRepeat) errors.passwordRepeat = 'No coincide con la contraseña.'
  return errors
}

export function codeErrors(code, codeRepeat, password) {
  const errors = {}
  if (code.length < MIN_SECRET_LENGTH) errors.code = `Usa al menos ${MIN_SECRET_LENGTH} caracteres.`
  else if (code === password) errors.code = 'Debe ser distinto de la contraseña.'
  else if (code !== codeRepeat) errors.codeRepeat = 'No coincide con el código.'
  return errors
}

/** @param {{ name: string, password: string, passwordRepeat: string, code: string, codeRepeat: string }} fields */
export function setupErrors(fields) {
  return {
    ...(fields.name.trim() ? {} : { name: 'Escribe tu nombre.' }),
    ...passwordErrors(fields.password, fields.passwordRepeat),
    ...codeErrors(fields.code, fields.codeRepeat, fields.password),
  }
}
