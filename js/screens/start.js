import { alertBox, button, run } from '../ui/controls.js'
import { h } from '../ui/dom.js'
import { frame, stepTitle } from './frame.js'

export function startScreen({ onCreate, onOpen }) {
  const alert = alertBox()
  const create = button('Crear archivo de notas', { onclick: () => go(create, onCreate) })
  const open = button('Abrir archivo existente', { variant: 'secondary', onclick: () => go(open, onOpen) })

  async function go(btn, action) {
    const other = btn === create ? open : create
    other.disabled = true
    await run(btn, alert, action)
    other.disabled = false
  }

  return frame(stepTitle('Primer uso'), h('div', { class: 'actions' }, create, open), alert.el)
}
