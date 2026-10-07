import { fileErrorMessage, isCancel } from '../data/file.js'
import { h, uid } from './dom.js'

/** Labeled input with optional hint, inline error and (for passwords) a show/hide toggle. */
export function field({ label, type = 'text', hint, autocomplete, autofocus = false }) {
  const id = uid('field')
  const secret = type === 'password'
  const input = h('input', { id, type, class: secret ? 'input has-toggle' : 'input', autocomplete, 'data-autofocus': autofocus })
  const hintEl = hint ? h('p', { id: `${id}-hint`, class: 'field-hint' }, hint) : null
  const errorEl = h('p', { id: `${id}-error`, class: 'field-error', hidden: true })

  const describe = () => {
    const ids = [hintEl?.id, !errorEl.hidden && errorEl.id].filter(Boolean).join(' ')
    if (ids) input.setAttribute('aria-describedby', ids)
    else input.removeAttribute('aria-describedby')
  }
  describe()

  let toggle = null
  if (secret) {
    toggle = h('button', { type: 'button', class: 'toggle', 'aria-pressed': 'false', 'aria-controls': id }, 'Mostrar')
    toggle.addEventListener('click', () => {
      const show = input.type === 'password'
      input.type = show ? 'text' : 'password'
      toggle.textContent = show ? 'Ocultar' : 'Mostrar'
      toggle.setAttribute('aria-pressed', String(show))
    })
  }

  return {
    el: h('div', {}, h('label', { for: id, class: 'field-label' }, label), hintEl, h('div', { class: 'field-box' }, input, toggle), errorEl),
    input,
    get value() {
      return input.value
    },
    clear() {
      input.value = ''
    },
    setError(message) {
      errorEl.textContent = message ?? ''
      errorEl.hidden = !message
      if (message) input.setAttribute('aria-invalid', 'true')
      else input.removeAttribute('aria-invalid')
      describe()
    },
  }
}

export function button(label, { variant = 'primary', type = 'button', block = false, small = false, onclick } = {}) {
  const classes = ['btn', `btn-${variant}`, block && 'btn-block', small && 'btn-small'].filter(Boolean).join(' ')
  return h('button', { type, class: classes, onclick }, label)
}

export const linkButton = (label, onclick) => h('button', { type: 'button', class: 'link', onclick }, label)

export function setBusy(btn, busy) {
  btn.disabled = busy
  if (busy) {
    btn.setAttribute('aria-busy', 'true')
    btn.prepend(h('span', { class: 'spinner', 'aria-hidden': 'true' }))
  } else {
    btn.removeAttribute('aria-busy')
    btn.querySelector('.spinner')?.remove()
  }
}

/** Message box under a form: errors are announced right away, confirmations politely. */
export function alertBox() {
  const el = h('div', { class: 'alert', hidden: true })
  return {
    el,
    show(message, tone = 'error') {
      el.className = tone === 'info' ? 'alert info' : 'alert'
      el.setAttribute('role', tone === 'info' ? 'status' : 'alert')
      el.textContent = message
      el.hidden = false
    },
    hide() {
      el.hidden = true
      el.textContent = ''
    },
  }
}

/** Runs an async action from a button: spinner while it runs, file problems shown in the alert. */
export async function run(btn, alert, action, fileName) {
  setBusy(btn, true)
  alert.hide()
  try {
    await action()
  } catch (error) {
    if (!isCancel(error)) alert.show(fileErrorMessage(error, fileName))
  } finally {
    setBusy(btn, false)
  }
}

/** Lets browsers and password managers tie a password field to the person. */
export const hiddenUsername = (name) =>
  h('input', { type: 'text', name: 'username', autocomplete: 'username', value: name, readonly: true, hidden: true })

/** After a failed submit, move focus to the first field marked invalid. */
export const focusFirstError = (form) => form.querySelector('[aria-invalid="true"]')?.focus()
