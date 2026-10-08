import { addSubject, moveSubject, removeSubject, updateSubject } from '../data/model.js'
import { confirmDialog } from '../ui/confirm.js'
import { alertBox, button } from '../ui/controls.js'
import { h, uid } from '../ui/dom.js'

let editing = null

// Subjects of the whole school, in boletín order. Each group picks its own in Grupos.
export function asignaturasView(app) {
  const subjects = app.data.subjects
  const areas = [...new Set(subjects.map((s) => s.area).filter(Boolean))]
  const areaListId = uid('areas')
  const alert = alertBox()

  const rows = subjects.map((s, i) => (s.id === editing ? editRow(app, s, i, areaListId, alert) : row(app, s, i, subjects.length)))
  const table =
    subjects.length > 0
      ? h(
          'div',
          { class: 'table-wrap section-gap' },
          h(
            'table',
            { class: 'table' },
            h('thead', {}, h('tr', {}, h('th', { class: 'num' }, 'N°'), h('th', {}, 'Asignatura'), h('th', {}, 'Área'), h('th', {}, h('span', { class: 'visually-hidden' }, 'Acciones')))),
            h('tbody', {}, rows),
          ),
        )
      : null

  return h(
    'div',
    { class: 'settings' },
    h('h1', { class: 'page-title' }, 'Asignaturas'),
    h('p', { class: 'hint' }, 'El orden de esta lista es el orden en que salen en el boletín.'),
    h('datalist', { id: areaListId }, areas.map((a) => h('option', { value: a }))),
    table,
    addForm(app, areaListId, alert),
    h('div', { class: 'section-gap' }, alert.el),
  )
}

function row(app, subject, index, total) {
  const act = (label, aria, onclick, disabled = false) =>
    h('button', { type: 'button', class: 'btn btn-secondary btn-small', 'aria-label': aria, disabled, onclick }, label)
  const move = (delta) => () => {
    app.commit(moveSubject(app.data, subject.id, delta))
    app.refresh()
  }
  return h(
    'tr',
    {},
    h('td', { class: 'num' }, String(index + 1)),
    h('td', {}, subject.name),
    h('td', {}, subject.area),
    h(
      'td',
      {},
      h(
        'div',
        { class: 'row-actions' },
        act('Subir', `Subir ${subject.name}`, move(-1), index === 0),
        act('Bajar', `Bajar ${subject.name}`, move(1), index === total - 1),
        act('Editar', `Editar ${subject.name}`, () => {
          editing = subject.id
          app.refresh('edit-subject')
        }),
        act('Eliminar', `Eliminar ${subject.name}`, async () => {
          const ok = await confirmDialog({
            title: `Eliminar ${subject.name}`,
            message: 'Se quitará de todos los grupos y se borrarán sus notas.',
            confirmLabel: 'Eliminar',
          })
          if (!ok) return
          app.commit(removeSubject(app.data, subject.id))
          app.refresh()
        }),
      ),
    ),
  )
}

function editRow(app, subject, index, areaListId, alert) {
  const name = h('input', { class: 'input', value: subject.name, 'aria-label': 'Asignatura', 'data-focus-key': 'edit-subject' })
  const area = h('input', { class: 'input', value: subject.area, 'aria-label': 'Área', list: areaListId })
  const close = () => {
    editing = null
    app.refresh()
  }
  const save = () => {
    try {
      app.commit(updateSubject(app.data, subject.id, { name: name.value, area: area.value }))
      close()
    } catch (error) {
      alert.show(error.message)
    }
  }
  const tr = h(
    'tr',
    {},
    h('td', { class: 'num' }, String(index + 1)),
    h('td', {}, name),
    h('td', {}, area),
    h('td', {}, h('div', { class: 'row-actions' }, button('Guardar', { small: true, onclick: save }), button('Cancelar', { variant: 'secondary', small: true, onclick: close }))),
  )
  tr.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
    if (e.key === 'Enter') save()
  })
  return tr
}

function addForm(app, areaListId, alert) {
  const nameId = uid('subject')
  const areaId = uid('area')
  const name = h('input', { class: 'input', id: nameId, autocomplete: 'off', 'data-focus-key': 'add-subject' })
  const area = h('input', { class: 'input', id: areaId, autocomplete: 'off', list: areaListId })
  const form = h(
    'form',
    { class: 'add-form', novalidate: true, style: '--cols: 2' },
    h('div', {}, h('label', { class: 'control-label', for: nameId }, 'Asignatura'), name),
    h('div', {}, h('label', { class: 'control-label', for: areaId }, 'Área (opcional)'), area),
    button('Agregar', { type: 'submit' }),
  )
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      app.commit(addSubject(app.data, { name: name.value, area: area.value }))
      app.refresh('add-subject')
    } catch (error) {
      alert.show(error.message)
      name.focus()
    }
  })
  return form
}
