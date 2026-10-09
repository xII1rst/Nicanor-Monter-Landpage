import { noteOf, setNote, sortedGroups, studentsOf } from '../data/model.js'
import { h } from '../ui/dom.js'
import { chosenGroup, chosenPeriod, emptyState, groupPicker, periodPicker } from '../ui/pickers.js'

const FIELDS = [
  ['comportamiento', 'Comportamiento social'],
  ['observaciones', 'Observaciones'],
]

// Comportamiento social and Observaciones of each student for one period, as printed
// at the bottom of their boletín. Typing saves.
export function comportamientoView(app) {
  const data = app.data
  const groups = sortedGroups(data)
  const title = h('h1', { class: 'page-title' }, 'Comportamiento')
  if (groups.length === 0) {
    return h('div', {}, h('div', { class: 'page-head' }, title), emptyState('Todavía no hay grupos. Crea los grupos con sus estudiantes para escribir su comportamiento.', 'Ir a Grupos', () => app.go('grupos')))
  }

  const group = chosenGroup(groups)
  const period = chosenPeriod()
  const students = studentsOf(data, group.id)

  const count = h('p', { class: 'count', role: 'status' })
  const refreshCount = () => {
    const done = students.filter((s) => noteOf(app.data, s.id, 'comportamiento', period).trim()).length
    count.replaceChildren(h('strong', {}, `${done} de ${students.length}`), ' con comportamiento')
  }
  const head = h('div', { class: 'page-head' }, title, h('div', { class: 'toolbar' }, groupPicker(app, groups, group), periodPicker(app, period), count))

  if (students.length === 0) {
    return h('div', {}, head, emptyState(`${group.name} todavía no tiene estudiantes.`, `Completar ${group.name}`, () => app.go('grupos')))
  }

  const rows = students.map((student, i) =>
    h(
      'div',
      { class: 'note-row' },
      h('div', { class: 'note-student' }, h('span', { class: 'meta' }, `${i + 1}. `), student.nombre),
      FIELDS.map(([field, label]) => {
        const box = h('textarea', { class: 'textarea textarea-short', rows: 2, 'aria-label': `${label}, ${student.nombre}`, placeholder: label })
        box.value = noteOf(data, student.id, field, period)
        box.addEventListener('input', () => {
          app.commit(setNote(app.data, student.id, field, period, box.value))
          refreshCount()
        })
        return box
      }),
    ),
  )
  refreshCount()

  return h(
    'div',
    {},
    head,
    h('p', { class: 'hint' }, `${group.name}, periodo ${period}. Lo que escribas sale al final del boletín de cada estudiante.`),
    h('div', { class: 'notes section-gap' }, h('div', { class: 'note-row note-head', 'aria-hidden': 'true' }, h('span', {}, 'Estudiante'), FIELDS.map(([, label]) => h('span', {}, label))), rows),
  )
}
