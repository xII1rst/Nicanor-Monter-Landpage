import { average, formatGrade, parseGrade } from '../data/grades.js'
import { completion, gradeOf, groupSubjects, setGrade, sortedGroups, studentsOf } from '../data/model.js'
import { alertBox, button, run } from '../ui/controls.js'
import { h, uid } from '../ui/dom.js'
import { PERIODS, chosenGroup, chosenPeriod, emptyState, groupPicker, periodPicker } from '../ui/pickers.js'
import { setPref } from '../ui/prefs.js'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Grade sheet for one group and one period: students down the side (sorted by
// name, surname first), the group's subjects across. Typing saves; Enter moves down a column,
// so a teacher's list for one subject goes in top to bottom. From period 2 on, each box
// has the earlier periods' notas beside it in grey, as the boletín lists 1P 2P 3P.
export function notasView(app) {
  const data = app.data
  const groups = sortedGroups(data)
  const title = h('h1', { class: 'page-title' }, 'Notas')
  const importAlert = alertBox()
  const importButton = (variant) => {
    const btn = button('Importar tabla', { variant, small: variant === 'secondary', onclick: () => run(btn, importAlert, app.importTable) })
    return btn
  }

  if (groups.length === 0) {
    return h(
      'div',
      {},
      h('div', { class: 'page-head' }, title),
      emptyState('Todavía no hay grupos. Importa una tabla de Excel con Nombre, Grado, Curso y las notas, o crea los grupos a mano.', 'Ir a Grupos', () => app.go('grupos'), importButton('secondary')),
      h('div', { class: 'section-gap' }, importAlert.el),
    )
  }

  const group = chosenGroup(groups)
  const period = chosenPeriod()
  const subjects = groupSubjects(data, group)
  const students = studentsOf(data, group.id)

  const count = h('p', { class: 'count', role: 'status' })
  const head = h(
    'div',
    { class: 'page-head' },
    title,
    h(
      'div',
      { class: 'toolbar' },
      groupPicker(app, groups, group),
      periodPicker(app, period),
      count,
      importButton('secondary'),
    ),
  )

  if (students.length === 0 || subjects.length === 0) {
    const missing = students.length === 0 && subjects.length === 0 ? 'estudiantes ni asignaturas' : students.length === 0 ? 'estudiantes' : 'asignaturas'
    return h('div', {}, head, importAlert.el, emptyState(`${group.name} todavía no tiene ${missing}.`, `Completar ${group.name}`, () => {
      setPref('groupId', group.id)
      app.go('grupos')
    }))
  }

  const lowLimit = data.settings.levels[1].min // below Básico = desempeño Bajo
  const earlierPeriods = PERIODS.filter((p) => p < period)
  const problems = alertBox()
  const missingCells = subjects.map(() => h('td', {}))

  function refreshCounts() {
    const { filled, total } = completion(app.data, group.id, period)
    count.replaceChildren(h('strong', {}, `${filled} de ${total}`), ' notas', filled === total ? '. Periodo completo.' : '')
    subjects.forEach((subject, c) => {
      const missing = students.filter((s) => gradeOf(app.data, s.id, subject.id, period) == null).length
      missingCells[c].textContent = String(missing)
    })
  }

  function refreshProblems() {
    const invalid = [...table.querySelectorAll('.cell[aria-invalid="true"]')]
    if (invalid.length === 0) return problems.hide()
    const first = invalid[0]
    const more = invalid.length > 1 ? ` Hay ${invalid.length} notas con error en total.` : ''
    problems.show(`${first.getAttribute('aria-label')}: ${first.title} No se guarda hasta que la corrijas.${more}`)
  }

  let autofocusSet = false
  const rows = students.map((student, r) => {
    const avgCell = h('td', { class: 'avg' })
    const refreshAverage = () => {
      const values = subjects.map((s) => gradeOf(app.data, student.id, s.id, period))
      const incomplete = values.some((v) => v == null)
      avgCell.textContent = formatGrade(average(values))
      avgCell.classList.toggle('partial', incomplete)
      avgCell.title = incomplete ? 'Promedio parcial: faltan notas' : ''
    }
    refreshAverage()

    const cells = subjects.map((subject, c) => {
      const value = gradeOf(data, student.id, subject.id, period)
      const input = h('input', {
        class: value != null && value < lowLimit ? 'cell low' : 'cell',
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        value: formatGrade(value),
        'aria-label': `${subject.name}, ${student.nombre}`,
        'data-row': r,
        'data-col': c,
        'data-autofocus': value == null && !autofocusSet,
      })
      if (value == null) autofocusSet = true
      input.addEventListener('input', () => {
        const result = parseGrade(input.value)
        if (result.error) {
          input.setAttribute('aria-invalid', 'true')
          input.title = result.error
        } else {
          input.removeAttribute('aria-invalid')
          input.removeAttribute('title')
          input.classList.toggle('low', result.value != null && result.value < lowLimit)
          app.commit(setGrade(app.data, student.id, subject.id, period, result.value))
          refreshAverage()
          refreshCounts()
        }
        refreshProblems()
      })
      if (earlierPeriods.length === 0) return h('td', {}, input)

      const values = earlierPeriods.map((p) => gradeOf(data, student.id, subject.id, p))
      const spoken = values.map((v, i) => `${i + 1}P ${v == null ? 'sin nota' : formatGrade(v)}`).join(', ')
      const earlier = h(
        'span',
        { class: 'earlier-group', id: uid('antes') },
        h('span', { class: 'visually-hidden' }, `Periodos anteriores: ${spoken}`),
        values.map((v) => h('span', { class: v != null && v < lowLimit ? 'earlier low' : 'earlier', 'aria-hidden': 'true' }, v == null ? '–' : formatGrade(v))),
      )
      input.setAttribute('aria-describedby', earlier.id)
      return h('td', {}, h('div', { class: 'periods' }, earlier, input))
    })

    return h('tr', {}, h('td', { class: 'num' }, String(r + 1)), h('th', { scope: 'row', class: 'student' }, student.nombre), cells, avgCell)
  })

  const table = h(
    'table',
    { class: earlierPeriods.length > 0 ? 'sheet with-earlier' : 'sheet', style: `--earlier: ${earlierPeriods.length}` },
    h('caption', { class: 'visually-hidden' }, `Notas de ${group.name}, periodo ${period}`),
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', { class: 'num', scope: 'col' }, 'N°'),
        h('th', { class: 'student', scope: 'col' }, 'Estudiante'),
        subjects.map((s) =>
          h(
            'th',
            { class: 'subject-head', scope: 'col', title: s.name },
            h('span', {}, s.name),
            earlierPeriods.length > 0 && h('div', { class: 'periods period-labels', 'aria-hidden': 'true' }, [...earlierPeriods, period].map((p) => h('span', { class: p === period ? 'current' : null }, `${p}P`))),
          ),
        ),
        h('th', { scope: 'col' }, 'Promedio'),
      ),
    ),
    h('tbody', {}, rows),
    h('tfoot', {}, h('tr', {}, h('th', { colspan: 2, scope: 'row' }, 'Sin nota'), missingCells, h('td', {}))),
  )

  table.addEventListener('focusin', (event) => {
    if (event.target.matches('.cell')) event.target.select()
  })
  table.addEventListener('keydown', (event) => moveWithKeys(event, table, students.length, subjects.length))

  refreshCounts()
  return h(
    'div',
    {},
    head,
    h('div', { class: 'import-alert' }, importAlert.el),
    h('div', { class: 'sheet-wrap' }, table),
    h('div', { class: 'sheet-error' }, problems.el),
    h(
      'div',
      { class: 'sheet-notes' },
      h('p', {}, `En rojo: desempeño Bajo (menos de ${formatGrade(lowLimit)}).${earlierPeriods.length > 0 ? ` En gris, las notas de ${earlierPeriods.length === 1 ? 'el periodo 1' : `los periodos 1 a ${period - 1}`}.` : ''}`),
      h('p', {}, `${plural(students.length, 'estudiante', 'estudiantes')}, ${plural(subjects.length, 'asignatura', 'asignaturas')}. Enter baja a la siguiente fila.`),
    ),
  )
}

// Enter / ↓ go down a column (Enter continues at the top of the next column after
// the last student); Shift+Enter / ↑ go up. Tab moves across, as usual.
function moveWithKeys(event, table, rowCount, colCount) {
  const input = event.target.closest('.cell')
  if (!input) return
  let row = Number(input.dataset.row)
  let col = Number(input.dataset.col)
  const up = event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey)
  const down = event.key === 'ArrowDown' || (event.key === 'Enter' && !event.shiftKey)
  if (!up && !down) return
  event.preventDefault()
  row += down ? 1 : -1
  if (row >= rowCount && event.key === 'Enter' && col + 1 < colCount) {
    row = 0
    col++
  }
  table.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`)?.focus()
}
