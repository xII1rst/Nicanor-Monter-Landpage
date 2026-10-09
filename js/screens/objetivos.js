import { copyObjectives, groupSubjects, objectiveOf, objectivesReplaced, setObjective, sortedGroups } from '../data/model.js'
import { confirmDialog } from '../ui/confirm.js'
import { alertBox, button } from '../ui/controls.js'
import { h, uid } from '../ui/dom.js'
import { chosenGroup, chosenPeriod, emptyState, groupPicker, periodPicker } from '../ui/pickers.js'

// Survives re-renders, like the open forms in Grupos.
let copying = false

// Objetivos of one group and period: one box per subject, one objetivo per line.
// Each line becomes a bullet in the boletín's Observaciones column. Typing saves.
export function objetivosView(app) {
  const data = app.data
  const groups = sortedGroups(data)
  const title = h('h1', { class: 'page-title' }, 'Objetivos')
  if (groups.length === 0) {
    return h('div', {}, h('div', { class: 'page-head' }, title), emptyState('Todavía no hay grupos. Crea los grupos con sus asignaturas para escribir sus objetivos.', 'Ir a Grupos', () => app.go('grupos')))
  }

  const group = chosenGroup(groups)
  const period = chosenPeriod()
  const subjects = groupSubjects(data, group)
  const others = groups.filter((g) => g.id !== group.id)

  const count = h('p', { class: 'count', role: 'status' })
  const refreshCount = () => {
    const done = subjects.filter((s) => objectiveOf(app.data, group.id, s.id, period).trim()).length
    count.replaceChildren(h('strong', {}, `${done} de ${subjects.length}`), ' asignaturas con objetivos')
  }
  const copyButton =
    others.length > 0 && !copying
      ? button('Copiar de otro grupo', {
          variant: 'secondary',
          small: true,
          onclick: () => {
            copying = true
            app.refresh()
          },
        })
      : null
  const head = h('div', { class: 'page-head' }, title, h('div', { class: 'toolbar' }, groupPicker(app, groups, group), periodPicker(app, period), count, copyButton))

  if (subjects.length === 0) {
    return h('div', {}, head, emptyState(`${group.name} todavía no tiene asignaturas.`, `Completar ${group.name}`, () => app.go('grupos')))
  }

  const boxes = subjects.map((subject) => {
    const id = uid('objetivo')
    const box = h('textarea', { class: 'textarea textarea-short', id, rows: 3 })
    box.value = objectiveOf(data, group.id, subject.id, period)
    box.addEventListener('input', () => {
      app.commit(setObjective(app.data, group.id, subject.id, period, box.value))
      refreshCount()
    })
    return h('div', {}, h('label', { class: 'control-label', for: id }, subject.name), box)
  })
  refreshCount()

  return h(
    'div',
    {},
    head,
    copying ? copyForm(app, group, others, period) : null,
    h('p', { class: 'hint' }, `Objetivos de ${group.name}, periodo ${period}. Un objetivo por línea: cada línea sale como una viñeta en el boletín.`),
    h('div', { class: 'objectives section-gap' }, boxes),
  )
}

function copyForm(app, group, others, period) {
  const id = uid('desde')
  const select = h('select', { class: 'select', id }, others.map((g) => h('option', { value: g.id }, g.name)))
  const alert = alertBox()
  const close = () => {
    copying = false
    app.refresh()
  }
  async function copy() {
    const from = others.find((g) => g.id === select.value)
    const next = copyObjectives(app.data, from.id, group.id, period)
    if (next === app.data) return alert.show(`${from.name} no tiene objetivos del periodo ${period} en asignaturas que ${group.name} también tenga.`)
    const replaced = objectivesReplaced(app.data, from.id, group.id, period)
    if (replaced > 0) {
      const what = replaced === 1 ? '1 objetivo ya escrito' : `${replaced} objetivos ya escritos`
      const ok = await confirmDialog({ title: 'Copiar objetivos', message: `Se cambiarán ${what} en ${group.name}.`, confirmLabel: 'Copiar' })
      if (!ok) return
    }
    app.commit(next)
    close()
  }
  return h(
    'section',
    { class: 'block copy-form' },
    h(
      'div',
      { class: 'inline-fields' },
      h('div', {}, h('label', { class: 'control-label', for: id }, `Copiar a ${group.name} los objetivos del periodo ${period} de`), select),
      button('Copiar', { onclick: copy }),
      button('Cancelar', { variant: 'secondary', onclick: close }),
    ),
    h('div', { class: 'section-gap' }, alert.el),
  )
}
