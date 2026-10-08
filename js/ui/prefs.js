// Small per-PC conveniences (last group and period opened). Safe to lose.
const KEY = 'nma.ui'

function all() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export const pref = (name, fallback) => all()[name] ?? fallback

export function setPref(name, value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...all(), [name]: value }))
  } catch {
    // Not remembered next time; nothing else depends on it.
  }
}
