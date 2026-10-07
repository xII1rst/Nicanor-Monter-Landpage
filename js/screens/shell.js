import { brand } from '../brand.js'
import { button } from '../ui/controls.js'
import { h } from '../ui/dom.js'
import { sealMark } from '../ui/seal.js'
import { securityDialog } from './security.js'

// App frame after entering. Groups, students and grade entry arrive in Phase 2.
export function shellScreen({ getData, onLock, onSave }) {
  const name = getData().auth?.name ?? ''
  const security = securityDialog({ getData, onSave })

  return h(
    'div',
    {},
    h(
      'header',
      { class: 'topbar' },
      h(
        'div',
        { class: 'topbar-inner' },
        sealMark(),
        h('span', { class: 'app-name' }, brand.appName),
        h(
          'div',
          { class: 'topbar-actions' },
          h('span', { class: 'user-name' }, name),
          button('Seguridad', { variant: 'secondary', small: true, onclick: security.open }),
          button('Bloquear', { variant: 'secondary', small: true, onclick: onLock }),
        ),
      ),
    ),
    h('main', { class: 'page' }, h('h1', { class: 'greeting' }, `Hola, ${name.split(' ')[0]}`)),
    security.el,
  )
}
