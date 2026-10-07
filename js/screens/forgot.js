import { passwordErrors } from '../data/auth.js'
import { alertBox, button, field, focusFirstError, hiddenUsername, linkButton } from '../ui/controls.js'
import { h } from '../ui/dom.js'
import { guardAttempts } from '../ui/guard.js'
import { frame, stepTitle } from './frame.js'

// onSubmit(code, newPassword) resolves false when the recovery code is wrong; throws for file problems.
export function forgotScreen({ fileName, userName, onSubmit, onBack }) {
  const code = field({ label: 'Código de recuperación', type: 'password', autocomplete: 'off', autofocus: true })
  const password = field({ label: 'Contraseña nueva', type: 'password', autocomplete: 'new-password', hint: 'Mínimo 6 caracteres.' })
  const repeat = field({ label: 'Repite la contraseña nueva', type: 'password', autocomplete: 'new-password' })
  const alert = alertBox()
  const label = 'Cambiar contraseña y entrar'
  const submit = button(label, { type: 'submit', block: true })
  const form = h('form', { class: 'stack', novalidate: true }, hiddenUsername(userName), code.el, password.el, repeat.el, alert.el, submit)
  const guard = guardAttempts({
    form,
    submit,
    label,
    lockInputs: [code.input],
    alert,
    wrongWhat: 'Código de recuperación incorrecto.',
    canSubmit: () => code.value.length > 0,
  })

  code.input.addEventListener('input', guard.refresh)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    const errors = passwordErrors(password.value, repeat.value)
    password.setError(errors.password)
    repeat.setError(errors.passwordRepeat)
    if (Object.keys(errors).length > 0) return focusFirstError(form)
    await guard.attempt(() => onSubmit(code.value, password.value), fileName)
    if (guard.wrong) {
      code.clear()
      guard.refresh()
      if (!code.input.disabled) code.input.focus()
    }
  })
  guard.refresh()

  return frame(
    stepTitle('Recuperar acceso'),
    form,
    h('div', { class: 'links' }, linkButton('Volver', onBack)),
    h('p', { class: 'note' }, '¿Perdiste el código? Quien instaló la app puede restablecer el acceso sin borrar las notas.'),
  )
}
