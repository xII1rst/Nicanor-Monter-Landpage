import { replacedCount } from '../data/import.js'
import { alertBox, button, run } from '../ui/controls.js'
import { h } from '../ui/dom.js'

const PERIODS = [1, 2, 3, 4]
const SHOWN_PROBLEMS = 20
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const nuevo = (isNew, word) => (isNew ? h('span', { class: 'tag' }, word) : null)

// What a table would add, shown before anything is saved. Used on the first screen
// (onConfirm creates the data file) and inside the app (onConfirm adds to the open file).
// onConfirm(period) gets null when the table has no notas.
export function importPanel({ data, fileName, preview, confirmLabel, onConfirm, onCancel }) {
  const alert = alertBox()
  const replaced = alertBox()
  const hasNotas = preview.notes > 0
  let period = null

  const periodButtons = PERIODS.map((p) =>
    h(
      'button',
      {
        type: 'button',
        'aria-pressed': 'false',
        onclick: () => {
          period = p
          periodButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(PERIODS[i] === p)))
          alert.hide()
          const count = replacedCount(data, preview, p)
          if (count > 0) replaced.show(`${plural(count, 'nota que ya estaba', 'notas que ya estaban')} en el periodo ${p} ${count === 1 ? 'se cambia por la' : 'se cambian por las'} de la tabla.`, 'info')
          else replaced.hide()
        },
      },
      String(p),
    ),
  )
  const periodBlock = hasNotas
    ? h(
        'div',
        { class: 'section-gap' },
        h('span', { class: 'control-label', id: 'importar-periodo' }, '¿De qué periodo son estas notas?'),
        h('div', { class: 'segmented', role: 'group', 'aria-labelledby': 'importar-periodo' }, periodButtons),
        h('div', { class: 'section-gap' }, replaced.el),
      )
    : null

  const { students } = preview
  const studentsText = students.new === students.total ? (students.total === 1 ? '1, nuevo' : `${students.total}, todos nuevos`) : students.new === 0 ? `${students.total}, ya estaban todos` : `${students.total} (${students.new} ${students.new === 1 ? 'nuevo' : 'nuevos'})`
  const summary = h(
    'dl',
    { class: 'summary' },
    h('dt', {}, 'Grupos'),
    h('dd', {}, preview.groups.map((g) => h('span', { class: 'summary-item' }, g.name, h('span', { class: 'meta' }, ` · ${plural(g.students, 'estudiante', 'estudiantes')}`), nuevo(g.isNew, 'nuevo')))),
    h('dt', {}, 'Estudiantes'),
    h('dd', {}, studentsText),
    hasNotas && h('dt', {}, 'Asignaturas'),
    hasNotas && h('dd', {}, preview.subjects.map((s) => h('span', { class: 'summary-item' }, s.name, nuevo(s.isNew, 'nueva')))),
    h('dt', {}, 'Notas'),
    h('dd', {}, String(preview.notes)),
    preview.emptyColumns.length > 0 && h('dt', {}, 'Sin notas'),
    preview.emptyColumns.length > 0 && h('dd', { class: 'meta' }, `${preview.emptyColumns.join(', ')} (no se agregan)`),
  )

  const problems =
    preview.problems.length > 0
      ? h(
          'div',
          { class: 'section-gap' },
          h('p', { class: 'hint' }, preview.problems.length === 1 ? '1 cosa no se importa; corrígela en la tabla si la necesitas:' : `${preview.problems.length} cosas no se importan; corrígelas en la tabla si las necesitas:`),
          h(
            'ul',
            { class: 'problems' },
            preview.problems.slice(0, SHOWN_PROBLEMS).map((p) => h('li', {}, h('span', { class: 'meta' }, `${p.where}: `), p.message)),
            preview.problems.length > SHOWN_PROBLEMS && h('li', { class: 'meta' }, `y ${preview.problems.length - SHOWN_PROBLEMS} más.`),
          ),
        )
      : null

  const confirm = button(confirmLabel)
  confirm.addEventListener('click', () => {
    if (hasNotas && period == null) {
      alert.show('Elige el periodo de las notas.')
      periodButtons[0].focus()
      return
    }
    run(confirm, alert, () => onConfirm(hasNotas ? period : null))
  })
  if (students.total === 0) {
    confirm.disabled = true
    alert.show('La tabla no tiene estudiantes que se puedan importar.')
  }

  return h(
    'div',
    { class: 'import' },
    h('p', { class: 'hint' }, 'Archivo: ', h('strong', {}, fileName)),
    periodBlock,
    h('div', { class: 'section-gap' }, summary),
    problems,
    h('div', { class: 'section-gap' }, alert.el),
    h('div', { class: 'inline-fields section-gap' }, confirm, button('Cancelar', { variant: 'secondary', onclick: onCancel })),
  )
}
