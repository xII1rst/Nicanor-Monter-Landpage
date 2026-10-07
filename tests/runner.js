// Tiny test runner that works in the browser: open tests/index.html with Five Server.
const tests = []
let prefix = ''

export function describe(name, fn) {
  const outer = prefix
  prefix = outer ? `${outer} › ${name}` : name
  fn()
  prefix = outer
}

export function it(name, fn) {
  tests.push({ name: `${prefix} › ${name}`, fn })
}

const show = (value) => (typeof value === 'string' ? `"${value}"` : JSON.stringify(value))

function deepEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((k) => deepEqual(a[k], b[k]))
}

function check(pass, message) {
  if (!pass) throw new Error(message)
}

export function expect(actual) {
  return {
    toBe: (expected) => check(Object.is(actual, expected), `expected ${show(expected)}, got ${show(actual)}`),
    toEqual: (expected) => check(deepEqual(actual, expected), `expected ${show(expected)}, got ${show(actual)}`),
    toContain: (part) => check(actual.includes(part), `expected ${show(actual)} to contain ${show(part)}`),
    toBeUndefined: () => check(actual === undefined, `expected undefined, got ${show(actual)}`),
    toThrow(part) {
      try {
        actual()
      } catch (error) {
        return check(!part || String(error.message).includes(part), `expected error containing ${show(part)}, got ${show(error.message)}`)
      }
      throw new Error('expected it to throw')
    },
    not: {
      toBe: (expected) => check(!Object.is(actual, expected), `expected anything but ${show(expected)}`),
      toContain: (part) => check(!actual.includes(part), `expected ${show(actual)} not to contain ${show(part)}`),
    },
  }
}

export async function run() {
  const list = document.getElementById('results')
  let failed = 0
  for (const test of tests) {
    const row = document.createElement('li')
    try {
      await test.fn()
      row.textContent = `✓ ${test.name}`
      row.className = 'pass'
    } catch (error) {
      failed++
      row.textContent = `✗ ${test.name}: ${error.message}`
      row.className = 'fail'
    }
    list.append(row)
  }
  const summary = failed ? `${failed} de ${tests.length} pruebas fallaron` : `${tests.length} pruebas pasaron`
  document.getElementById('summary').textContent = summary
  document.getElementById('summary').className = failed ? 'fail' : 'pass'
  document.title = failed ? `✗ ${summary}` : `✓ ${summary}`
}
