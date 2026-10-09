import {
  GRADE_LEVELS,
  addGroup,
  addStudent,
  addStudents,
  removeGroup,
  removeStudent,
  setGroupSubjects,
  sortedGroups,
  studentsOf,
  updateGroup,
  updateStudent,
} from '../data/model.js'
import { parseStudentList } from '../data/paste.js'
import { confirmDialog } from '../ui/confirm.js'
import { alertBox, button } from '../ui/controls.js'
import { h, uid } from '../ui/dom.js'
import { pref, setPref } from '../ui/prefs.js'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// What is being edited survives re-renders, so a save elsewhere doesn't close it.
let editingStudent = null
let editingGroup = false
let pasting = false

export function gruposView(app) {
  const data = app.data
  const groups = sortedGroups(data)
  const selected = groups.find((g) => g.id === pref('groupId')) ?? groups[0]

  const list = h(
    'div',
    { class: 'group-list' },
    groups.map((g) =>
      h(
        'button',
        {
          type: 'button',
          class: 'group-item',
          'aria-current': g.id === selected?.id ? 'true' : null,
          onclick: () => {
            setPref('groupId', g.id)
            editingStudent = null
            editingGroup = false
            pasting = false
            app.refresh()
          },
        },
        g.name,
        h('span', { class: 'meta' }, plural(studentsOf(data, g.id).length, 'estudiante', 'estudiantes')),
      ),
    ),
  )

  return h(
    'div',
    { class: 'split' },
    h('div', {}, h('h1', { class: 'page-title' }, 'Grupos'), groups.length > 0 && list, newGroupForm(app, groups.length === 0)),
    selected ? groupDetail(app, selected) : h('div', { class: 'empty' }, h('p', {}, 'Crea el primer grupo: elige el grado y escribe el curso (01, 02…).')),
  )
}

function gradeSelect(id, value = '1°') {
  const select = h('select', { class: 'select', id }, GRADE_LEVELS.map((g) => h('option', { value: g }, g)))
  select.value = value
  return select
}

function newGroupForm(app, first) {
  const gradeId = uid('grade')
  const sectionId = uid('section')
  const grade = gradeSelect(gradeId)
  const section = h('input', { class: 'input input-narrow', id: sectionId, maxlength: 3, autocomplete: 'off', 'data-focus-key': 'new-group' })
  const alert = alertBox()
  const form = h(
    'form',
    { class: first ? 'section-gap' : 'new-group', novalidate: true },
    h('h2', { class: 'block-title' }, 'Nuevo grupo'),
    h(
      'div',
      { class: 'inline-fields section-gap' },
      h('div', {}, h('label', { class: 'control-label', for: gradeId }, 'Grado'), grade),
      h('div', {}, h('label', { class: 'control-label', for: sectionId }, 'Curso'), section),
      button('Crear', { type: 'submit' }),
    ),
    h('div', { class: 'section-gap' }, alert.el),
  )
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const before = app.data.groups.length
      const next = addGroup(app.data, { grade: grade.value, section: section.value })
      app.commit(next)
      setPref('groupId', next.groups[before].id)
      app.refresh('add-student')
    } catch (error) {
      alert.show(error.message)
    }
  })
  return form
}

function groupDetail(app, group) {
  const data = app.data
  const students = studentsOf(data, group.id)
  const alert = alertBox()

  const title = editingGroup
    ? groupEditForm(app, group, alert)
    : h(
        'div',
        { class: 'block-head' },
        h('h2', { class: 'group-title' }, group.name),
        h(
          'div',
          { class: 'row-actions' },
          button('Editar grupo', {
            variant: 'secondary',
            small: true,
            onclick: () => {
              editingGroup = true
              app.refresh('group-grade')
            },
          }),
          button('Eliminar grupo', {
            variant: 'secondary',
            small: true,
            onclick: async () => {
              try {
                const next = removeGroup(app.data, group.id)
                if (!(await confirmDialog({ title: `Eliminar ${group.name}`, message: 'El grupo no tiene estudiantes. Se eliminará de la lista.', confirmLabel: 'Eliminar' }))) return
                app.commit(next)
                setPref('groupId', null)
                app.refresh()
              } catch (error) {
                alert.show(error.message)
              }
            },
          }),
        ),
      )

  return h('div', {}, title, alert.el, studentsBlock(app, group, students), subjectsBlock(app, group))
}

function groupEditForm(app, group, alert) {
  const grade = gradeSelect(uid('grade'), group.gradeLevel)
  grade.dataset.focusKey = 'group-grade'
  grade.setAttribute('aria-label', 'Grado')
  const section = h('input', { class: 'input input-narrow', value: group.section ?? '', maxlength: 3, 'aria-label': 'Curso' })
  const form = h(
    'form',
    { class: 'block-head', novalidate: true },
    h('div', { class: 'inline-fields' }, grade, section, button('Guardar', { type: 'submit', small: true }), button('Cancelar', { variant: 'secondary', small: true, onclick: cancel })),
  )
  function cancel() {
    editingGroup = false
    app.refresh()
  }
  form.addEventListener('keydown', (e) => e.key === 'Escape' && cancel())
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      app.commit(updateGroup(app.data, group.id, { grade: grade.value, section: section.value }))
      editingGroup = false
      app.refresh()
    } catch (error) {
      alert.show(error.message)
    }
  })
  return form
}

// ---------- Students ----------

function studentsBlock(app, group, students) {
  const groups = sortedGroups(app.data)
  const rows = students.map((s, i) => (s.id === editingStudent ? studentEditRow(app, s, i, groups) : studentRow(app, s, i)))
  const table =
    students.length > 0
      ? h(
          'div',
          { class: 'table-wrap' },
          h(
            'table',
            { class: 'table' },
            h('thead', {}, h('tr', {}, h('th', { class: 'num' }, 'N°'), h('th', {}, 'Nombre'), h('th', {}, h('span', { class: 'visually-hidden' }, 'Acciones')))),
            h('tbody', {}, rows),
          ),
        )
      : null

  return h(
    'section',
    { class: 'block section-gap' },
    h(
      'div',
      { class: 'block-head' },
      h('h3', { class: 'block-title' }, 'Estudiantes', h('span', { class: 'meta' }, String(students.length))),
      !pasting &&
        button('Pegar una lista', {
          variant: 'secondary',
          small: true,
          onclick: () => {
            pasting = true
            app.refresh('paste')
          },
        }),
    ),
    pasting ? pasteForm(app, group) : null,
    table,
    addStudentForm(app, group),
  )
}

function studentRow(app, student, index) {
  const name = student.nombre
  return h(
    'tr',
    {},
    h('td', { class: 'num' }, String(index + 1)),
    h('td', {}, name),
    h(
      'td',
      {},
      h(
        'div',
        { class: 'row-actions' },
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            'aria-label': `Editar a ${name}`,
            onclick: () => {
              editingStudent = student.id
              app.refresh('edit-student')
            },
          },
          'Editar',
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            'aria-label': `Eliminar a ${name}`,
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Eliminar estudiante', message: `Se eliminará a ${name} y todas sus notas.`, confirmLabel: 'Eliminar' })
              if (!ok) return
              app.commit(removeStudent(app.data, student.id))
              app.refresh()
            },
          },
          'Eliminar',
        ),
      ),
    ),
  )
}

function studentEditRow(app, student, index, groups) {
  const nombre = h('input', { class: 'input', value: student.nombre, 'aria-label': 'Nombre', 'data-focus-key': 'edit-student' })
  const groupSelect = h('select', { class: 'select', 'aria-label': 'Grupo' }, groups.map((g) => h('option', { value: g.id }, g.name)))
  groupSelect.value = student.groupId
  const error = h('p', { class: 'field-error', hidden: true })

  const close = () => {
    editingStudent = null
    app.refresh()
  }
  const save = () => {
    try {
      app.commit(updateStudent(app.data, student.id, { nombre: nombre.value, groupId: groupSelect.value }))
      close()
    } catch (e) {
      error.textContent = e.message
      error.hidden = false
    }
  }
  const row = h(
    'tr',
    {},
    h('td', { class: 'num' }, String(index + 1)),
    h('td', {}, nombre, error),
    h('td', {}, h('div', { class: 'row-actions' }, groupSelect, button('Guardar', { small: true, onclick: save }), button('Cancelar', { variant: 'secondary', small: true, onclick: close }))),
  )
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
    if (e.key === 'Enter' && e.target.matches('input')) save()
  })
  return row
}

function addStudentForm(app, group) {
  const id = uid('nombre')
  const nombre = h('input', { class: 'input', id, autocomplete: 'off', 'data-focus-key': 'add-student' })
  const alert = alertBox()
  const form = h(
    'form',
    { class: 'add-form', novalidate: true, style: '--cols: 1' },
    h('div', {}, h('label', { class: 'control-label', for: id }, 'Nombre (apellidos y nombres)'), nombre),
    button('Agregar', { type: 'submit' }),
  )
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      app.commit(addStudent(app.data, group.id, { nombre: nombre.value }))
      app.refresh('add-student') // back to the box for the next one
    } catch (error) {
      alert.show(error.message)
      nombre.focus()
    }
  })
  return h('div', {}, form, h('div', { class: 'section-gap' }, alert.el))
}

function pasteForm(app, group) {
  const id = uid('paste')
  const textarea = h('textarea', { class: 'textarea', id, 'data-focus-key': 'paste', spellcheck: 'false' })
  const preview = h('div', { class: 'section-gap' })
  const add = button('Agregar', { type: 'submit' })
  let rows = []

  function render() {
    rows = parseStudentList(textarea.value)
    const good = rows.filter((r) => !r.problem)
    add.textContent = good.length > 0 ? `Agregar ${plural(good.length, 'estudiante', 'estudiantes')}` : 'Agregar'
    add.disabled = good.length === 0
    if (rows.length === 0) return preview.replaceChildren()
    const skipped = rows.length - good.length
    preview.replaceChildren(
      h(
        'div',
        { class: 'table-wrap' },
        h(
          'table',
          { class: 'table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Nombre'), h('th', {}, h('span', { class: 'visually-hidden' }, 'Problema')))),
          h(
            'tbody',
            {},
            rows.map((r) => h('tr', { class: r.problem ? 'problem' : null }, h('td', {}, r.nombre), h('td', {}, r.problem ?? ''))),
          ),
        ),
      ),
      skipped > 0 ? h('p', { class: 'hint section-gap' }, `${plural(skipped, 'línea en rojo no se agregará', 'líneas en rojo no se agregarán')}: corrígelas en el texto.`) : null,
    )
  }
  textarea.addEventListener('input', render)

  const form = h(
    'form',
    { class: 'block section-gap', novalidate: true },
    h('label', { class: 'control-label', for: id }, 'Copia la lista desde Excel o escribe un estudiante por línea (apellidos y nombres)'),
    textarea,
    preview,
    h(
      'div',
      { class: 'inline-fields section-gap' },
      add,
      button('Cancelar', {
        variant: 'secondary',
        onclick: () => {
          pasting = false
          app.refresh()
        },
      }),
    ),
  )
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const good = rows.filter((r) => !r.problem)
    if (good.length === 0) return
    app.commit(addStudents(app.data, group.id, good))
    pasting = false
    app.refresh()
  })
  render()
  return form
}

// ---------- Subjects of the group ----------

function subjectsBlock(app, group) {
  const subjects = app.data.subjects
  const head = h('div', { class: 'block-head' }, h('h3', { class: 'block-title' }, `Asignaturas de ${group.name}`))
  if (subjects.length === 0) {
    return h('section', { class: 'block' }, head, h('div', { class: 'empty' }, h('p', {}, 'Todavía no hay asignaturas.'), button('Ir a Asignaturas', { onclick: () => app.go('asignaturas') })))
  }
  const boxes = subjects.map((s) => {
    const box = h('input', { type: 'checkbox', value: s.id, checked: group.subjectIds.includes(s.id) })
    box.addEventListener('change', () => {
      const chosen = boxes.filter((b) => b.checked).map((b) => b.value)
      app.commit(setGroupSubjects(app.data, group.id, chosen))
    })
    return box
  })
  return h(
    'section',
    { class: 'block' },
    head,
    h(
      'div',
      { class: 'checks' },
      subjects.map((s, i) => h('label', { class: 'check' }, boxes[i], s.name)),
    ),
  )
}
