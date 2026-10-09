import { button } from './controls.js'
import { h, uid } from './dom.js'
import { pref, setPref } from './prefs.js'

// Notas, Objetivos, Comportamiento and Boletines share the chosen group and period
// (remembered on this PC), so moving between them keeps the same group open.

export const PERIODS = [1, 2, 3, 4]

export const chosenGroup = (groups) => groups.find((g) => g.id === pref('groupId')) ?? groups[0]
export const chosenPeriod = () => pref('period', 1)

export function groupPicker(app, groups, group) {
  const id = uid('grupo')
  const select = h('select', { class: 'select', id }, groups.map((g) => h('option', { value: g.id }, g.name)))
  select.value = group.id
  select.addEventListener('change', () => {
    setPref('groupId', select.value)
    app.refresh()
  })
  return h('div', {}, h('label', { class: 'control-label', for: id }, 'Grupo'), select)
}

export function periodPicker(app, period) {
  const id = uid('periodo')
  const buttons = PERIODS.map((p) =>
    h(
      'button',
      {
        type: 'button',
        'aria-pressed': String(p === period),
        onclick: () => {
          setPref('period', p)
          app.refresh()
        },
      },
      String(p),
    ),
  )
  return h('div', {}, h('span', { class: 'control-label', id }, 'Periodo'), h('div', { class: 'segmented', role: 'group', 'aria-labelledby': id }, buttons))
}

/** Dashed box with a message and what to do about it. */
export function emptyState(message, actionLabel, action, extra) {
  return h('div', { class: 'empty' }, h('p', {}, message), h('div', { class: 'empty-actions' }, button(actionLabel, { onclick: action }), extra))
}
