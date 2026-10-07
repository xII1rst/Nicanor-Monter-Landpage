// h('button', { class: 'btn', onclick: fn }, 'Text') → <button class="btn">Text</button>
// Text children are inserted as text, never as HTML, so names from the data file are safe.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value)
    else if (key === 'class') el.className = value
    else el.setAttribute(key, value === true ? '' : String(value))
  }
  el.append(...children.flat().filter((child) => child != null && child !== false))
  return el
}

let counter = 0
export const uid = (prefix = 'id') => `${prefix}-${++counter}`

/** Shows a screen, replacing the previous one, and focuses the field marked to receive focus. */
export function mount(screen) {
  document.getElementById('app').replaceChildren(screen)
  screen.querySelector('[data-autofocus]')?.focus()
}
