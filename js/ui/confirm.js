import { button } from './controls.js'
import { h, uid } from './dom.js'

/** Asks before something that can't be undone. Resolves true only if the person confirms. */
export function confirmDialog({ title, message, confirmLabel }) {
  return new Promise((resolve) => {
    const titleId = uid('confirm')
    let confirmed = false
    const dialog = h(
      'dialog',
      { class: 'dialog dialog-small', 'aria-labelledby': titleId },
      h('h2', { id: titleId, class: 'dialog-title' }, title),
      h('p', { class: 'lead section-gap' }, message),
      h(
        'div',
        { class: 'dialog-actions' },
        button('Cancelar', { variant: 'secondary', onclick: () => dialog.close() }),
        button(confirmLabel, {
          variant: 'danger',
          onclick: () => {
            confirmed = true
            dialog.close()
          },
        }),
      ),
    )
    dialog.addEventListener('close', () => {
      dialog.remove()
      resolve(confirmed)
    })
    document.body.append(dialog)
    dialog.showModal() // focus lands on "Cancelar": the safe choice
  })
}
