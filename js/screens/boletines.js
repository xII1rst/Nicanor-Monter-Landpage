import { boletinFileName, makeBoletines } from '../data/boletin.js'
import { missingGrades, missingObjectives } from '../data/missing.js'
import { groupSubjects, sortedGroups, studentsOf } from '../data/model.js'
import { alertBox, button, linkButton, setBusy } from '../ui/controls.js'
import { h } from '../ui/dom.js'
import { chosenGroup, chosenPeriod, emptyState, groupPicker, periodPicker } from '../ui/pickers.js'
import { setPref } from '../ui/prefs.js'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// Review the selected period before downloading the whole group's Word boletines.
// Missing grades and objectives warn, but do not prevent generation.
export function boletinesView(app) {
  const data = app.data
  const groups = sortedGroups(data)
  const title = h('h1', { class: 'page-title' }, 'Boletines')
  if (groups.length === 0) {
    return h('div', {}, h('div', { class: 'page-head' }, title), emptyState('Todavía no hay grupos. Crea los grupos con sus estudiantes y asignaturas para hacer sus boletines.', 'Ir a Grupos', () => app.go('grupos')))
  }

  const group = chosenGroup(groups)
  const period = chosenPeriod()
  const subjects = groupSubjects(data, group)
  const students = studentsOf(data, group.id)
  const go = (view) => {
    setPref('groupId', group.id)
    app.go(view)
  }
  const head = h('div', { class: 'page-head' }, title, h('div', { class: 'toolbar' }, groupPicker(app, groups, group), periodPicker(app, period)))
  if (students.length === 0 || subjects.length === 0) {
    const missing = students.length === 0 && subjects.length === 0 ? 'estudiantes ni asignaturas' : students.length === 0 ? 'estudiantes' : 'asignaturas'
    return h('div', {}, head, emptyState(`${group.name} todavía no tiene ${missing}.`, `Completar ${group.name}`, () => go('grupos')))
  }

  const grades = missingGrades(data, group.id, period)
  const objectives = missingObjectives(data, group.id, period)
  const missingCount = grades.reduce((sum, row) => sum + row.subjects.length, 0)
  const incomplete = missingCount > 0 || objectives.length > 0
  const alert = alertBox()
  const downloadButton = button(incomplete ? 'Generar de todos modos' : 'Hacer boletín', { onclick: generate })
  const root = h(
    'div',
    {},
    head,
    h('div', { class: 'boletines' },
      h('p', { class: 'hint' }, `${group.name}, periodo ${period}. ${plural(students.length, 'boletín', 'boletines')} en un solo archivo Word, en orden alfabético.`),
      h('div', { class: 'boletin-checks section-gap' },
        h('section', { class: 'boletin-check' },
          h('div', { class: 'block-head' }, h('h2', { class: 'block-title' }, missingCount ? `Faltan ${plural(missingCount, 'nota', 'notas')}` : 'Notas completas'), linkButton('Ir a Notas', () => go('notas'))),
          grades.length > 0
            ? h('ul', { class: 'missing-list' }, grades.map(({ student, subjects }) => h('li', {}, h('strong', {}, student.nombre), ': ', subjects.map((s) => s.name).join(', '))))
            : h('p', { class: 'hint' }, `Todos los estudiantes tienen sus notas del periodo ${period}.`),
        ),
        h('section', { class: 'boletin-check' },
          h('div', { class: 'block-head' }, h('h2', { class: 'block-title' }, objectives.length ? `${plural(objectives.length, 'asignatura sin objetivos', 'asignaturas sin objetivos')}` : 'Objetivos completos'), linkButton('Ir a Objetivos', () => go('objetivos'))),
          objectives.length > 0
            ? h('ul', { class: 'missing-list' }, objectives.map((s) => h('li', {}, s.name)))
            : h('p', { class: 'hint' }, `Todas las asignaturas tienen objetivos del periodo ${period}.`),
        ),
      ),
      h('p', { class: 'hint section-gap' }, incomplete ? 'Puedes completar lo que falta o generar de todos modos. Las notas y los objetivos que faltan quedarán en blanco.' : 'Todo listo para hacer los boletines.'),
      h('p', { class: 'hint section-gap' }, `Se incluyen las notas de los periodos 1 a ${period}, el desempeño, los objetivos, el comportamiento social y las observaciones del periodo ${period}.`),
      h('div', { class: 'inline-fields section-gap' }, downloadButton, linkButton('Ir a Comportamiento', () => go('comportamiento'))),
      h('div', { class: 'section-gap' }, alert.el),
    ),
  )

  async function generate() {
    if (downloadButton.disabled) return
    setBusy(downloadButton, true)
    alert.hide()
    try {
      const response = await fetch(new URL('../../templates/boletin.docx', import.meta.url))
      if (!response.ok) throw new Error('No se pudo cargar la plantilla del boletín. Intenta de nuevo.')
      const bytes = await makeBoletines(new Uint8Array(await response.arrayBuffer()), data, group.id, period)
      // Navigating away or locking while generating cancels the download.
      if (!root.isConnected) return
      const name = boletinFileName(group, period)
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const link = h('a', { href: URL.createObjectURL(blob), download: name, hidden: true })
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      alert.show(`Archivo descargado: ${name}. Ábrelo en Word para revisar e imprimir.`, 'info')
    } catch {
      alert.show('No se pudieron generar los boletines. Intenta de nuevo. Si el problema continúa, vuelve a abrir la app con internet para cargar la plantilla.')
    } finally {
      setBusy(downloadButton, false)
    }
  }

  return root
}
