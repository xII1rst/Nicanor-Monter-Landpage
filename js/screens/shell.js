import { brand } from '../brand.js'
import { button, linkButton } from '../ui/controls.js'
import { h } from '../ui/dom.js'
import { escudoMark } from '../ui/escudo.js'

export const SECTIONS = [
  ['notas', 'Notas'],
  ['objetivos', 'Objetivos'],
  ['comportamiento', 'Comportamiento'],
  ['boletines', 'Boletines'],
  ['grupos', 'Grupos'],
  ['asignaturas', 'Asignaturas'],
  ['ajustes', 'Ajustes'],
]

// App frame after entering: escudo, sections, save status, name and lock.
export function shellScreen({ app, view, content, saveStatus }) {
  return h(
    'div',
    {},
    h(
      'header',
      { class: 'topbar' },
      h(
        'div',
        { class: 'topbar-inner' },
        escudoMark(),
        h('span', { class: 'app-name' }, brand.appName),
        h(
          'nav',
          { class: 'tabs', 'aria-label': 'Secciones' },
          SECTIONS.map(([id, label]) => h('button', { type: 'button', class: 'tab', 'aria-current': id === view ? 'page' : null, onclick: () => app.go(id) }, label)),
        ),
        h(
          'div',
          { class: 'topbar-actions' },
          saveStatusEl(app, saveStatus),
          h('span', { class: 'user-name' }, app.data.auth.name),
          button('Bloquear', { variant: 'secondary', small: true, onclick: app.lock }),
        ),
      ),
    ),
    h('main', { class: 'page', id: 'view' }, content),
  )
}

/** "Guardando…", "Guardado" or a failure with a retry button. Updated in place by main.js. */
export function saveStatusEl(app, status) {
  const el = h('span', { id: 'save-status', class: status === 'error' ? 'save-status error' : 'save-status', role: 'status' })
  if (status === 'saving') el.textContent = 'Guardando…'
  else if (status === 'saved') el.textContent = 'Guardado'
  else if (status === 'error') el.append('No se pudo guardar', linkButton('Reintentar', app.retrySave))
  return el
}
