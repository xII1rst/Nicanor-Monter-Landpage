// Wrong attempts are shared by the password and the recovery code, and survive
// a page reload, so closing the app doesn't skip the wait.
import { afterFailure, FREE_ATTEMPTS } from './data/auth.js'

const KEY = 'nma.attempts'
const none = { failures: 0, until: 0 }
let memory = none // fallback when browser storage is blocked

function load() {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? JSON.parse(saved) : none
  } catch {
    return memory
  }
}

function save(attempts) {
  memory = attempts
  try {
    localStorage.setItem(KEY, JSON.stringify(attempts))
  } catch {
    // Storage blocked: the in-memory copy keeps counting until the page reloads.
  }
}

export const waitMs = () => Math.max(0, load().until - Date.now())
/** Tries left before a wait kicks in (0 once waiting has started). */
export const triesLeft = () => Math.max(0, FREE_ATTEMPTS + 1 - load().failures)
export const recordFailure = () => save(afterFailure(load(), Date.now()))
export const clearFailures = () => save(none)

export function formatWait(ms) {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function wrongMessage(what, tries) {
  if (tries === 0) return `${what} Si vuelves a fallar, tendrás que esperar otra vez.`
  if (tries === 1) return `${what} Si vuelves a fallar, tendrás que esperar 30 segundos.`
  if (tries <= 3) return `${what} Te quedan ${tries} intentos antes de tener que esperar.`
  return what
}

// Fixed text on purpose: a ticking countdown inside an alert would be re-read aloud by
// screen readers every second. The countdown lives on the button instead.
export const waitMessage = 'Demasiados intentos fallidos. Podrás intentar de nuevo cuando termine la espera.'
