import { alertBox, button, field, hiddenUsername, linkButton, run } from '../ui/controls.js'
import { h } from '../ui/dom.js'
import { guardAttempts } from '../ui/guard.js'
import { frame, stepTitle } from './frame.js'

// Used both to enter the app and to unlock it after it locks itself.
// onSubmit(password) resolves false when the password is wrong and throws for file problems.
export function gateScreen({ title, userName, fileName, submitLabel, onSubmit, onForgot, onOtherFile }) {
  const password = field({ label: 'Contraseña', type: 'password', autocomplete: 'current-password', autofocus: true })
  const alert = alertBox()
  const submit = button(submitLabel, { type: 'submit', block: true })
  const form = h('form', { class: 'stack', novalidate: true }, hiddenUsername(userName), password.el, alert.el, submit)
  const guard = guardAttempts({
    form,
    submit,
    label: submitLabel,
    lockInputs: [password.input],
    alert,
    wrongWhat: 'Contraseña incorrecta.',
    canSubmit: () => password.value.length > 0,
  })

  password.input.addEventListener('input', guard.refresh)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    await guard.attempt(() => onSubmit(password.value), fileName)
    if (guard.wrong) {
      password.clear()
      guard.refresh()
      if (!password.input.disabled) password.input.focus()
    }
  })
  guard.refresh()

  const other = onOtherFile && linkButton('Usar otro archivo', () => run(other, alert, onOtherFile))
  return frame(stepTitle(title), form, h('div', { class: 'links' }, linkButton('Olvidé mi contraseña', onForgot), other))
}
