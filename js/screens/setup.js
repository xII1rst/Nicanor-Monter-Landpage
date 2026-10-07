import { setupErrors } from '../data/auth.js'
import { alertBox, button, field, focusFirstError, run } from '../ui/controls.js'
import { h } from '../ui/dom.js'
import { frame, stepTitle } from './frame.js'

export function setupScreen({ fileName, onSubmit }) {
  const fields = {
    name: field({ label: 'Tu nombre', autocomplete: 'username', autofocus: true }),
    password: field({ label: 'Contraseña', type: 'password', autocomplete: 'new-password', hint: 'Mínimo 6 caracteres.' }),
    passwordRepeat: field({ label: 'Repite la contraseña', type: 'password', autocomplete: 'new-password' }),
    code: field({ label: 'Código de recuperación', type: 'password', autocomplete: 'off', hint: 'Anótalo: lo necesitarás si olvidas la contraseña.' }),
    codeRepeat: field({ label: 'Repite el código', type: 'password', autocomplete: 'off' }),
  }
  const alert = alertBox()
  const submit = button('Guardar y entrar', { type: 'submit', block: true })
  const form = h(
    'form',
    { class: 'stack', novalidate: true },
    fields.name.el,
    fields.password.el,
    fields.passwordRepeat.el,
    h('div', { class: 'separated' }, fields.code.el),
    fields.codeRepeat.el,
    alert.el,
    submit,
  )

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const values = Object.fromEntries(Object.entries(fields).map(([key, f]) => [key, f.value]))
    const errors = setupErrors(values)
    for (const [key, f] of Object.entries(fields)) f.setError(errors[key])
    if (Object.keys(errors).length > 0) return focusFirstError(form)
    run(submit, alert, () => onSubmit(values), fileName)
  })

  return frame(stepTitle('Configura tu acceso'), form)
}
