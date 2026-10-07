import { codeErrors, hashSecret, passwordErrors, verifySecret } from '../data/auth.js'
import { alertBox, button, field, focusFirstError, hiddenUsername, run } from '../ui/controls.js'
import { h, uid } from '../ui/dom.js'

const LOCK_OPTIONS = [5, 10, 15, 30, 60]

// "Seguridad" panel. getData() always returns the latest saved data;
// onSave(next) writes it to the file.
export function securityDialog({ getData, onSave }) {
  const titleId = uid('security')
  const sections = [passwordSection(getData, onSave), codeSection(getData, onSave)]
  const lock = lockSection(getData, onSave)
  const dialog = h(
    'dialog',
    { class: 'dialog', 'aria-labelledby': titleId },
    h(
      'div',
      { class: 'dialog-head' },
      h('h2', { id: titleId, class: 'dialog-title' }, 'Seguridad'),
      button('Cerrar', { variant: 'secondary', small: true, onclick: () => dialog.close() }),
    ),
    ...sections.map((s) => s.el),
    lock.el,
  )
  // Closing forgets anything half-typed, so passwords never linger in the page.
  dialog.addEventListener('close', () => {
    for (const s of [...sections, lock]) s.reset()
  })
  return { el: dialog, open: () => dialog.showModal() }
}

// One change at a time: opening a section closes the other (exclusive <details>).
function section(title, body) {
  return h(
    'details',
    { class: 'section', name: 'seguridad' },
    h(
      'summary',
      {},
      h('span', { class: 'section-title' }, title),
      h('span', { class: 'section-state', 'aria-hidden': 'true' }, h('span', { class: 'when-closed' }, 'Cambiar'), h('span', { class: 'when-open' }, 'Cancelar')),
    ),
    h('div', { class: 'section-body' }, body),
  )
}

function secretForm(getData, { submitLabel, fields, validate, apply, doneMessage }) {
  const current = field({ label: 'Contraseña actual', type: 'password', autocomplete: 'current-password' })
  const all = [current, ...fields]
  const alert = alertBox()
  const submit = button(submitLabel, { type: 'submit' })
  const form = h('form', { class: 'stack', novalidate: true }, hiddenUsername(getData().auth?.name ?? ''), ...all.map((f) => f.el), alert.el, submit)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    alert.hide()
    const errors = validate(current.value)
    current.setError(current.value ? null : 'Escribe tu contraseña actual.')
    fields.forEach((f, i) => f.setError(errors[i]))
    if (!current.value || errors.some(Boolean)) return focusFirstError(form)
    run(submit, alert, async () => {
      const data = getData()
      if (!(await verifySecret(current.value, data.auth.password))) {
        current.setError('La contraseña actual no es correcta.')
        return focusFirstError(form)
      }
      await apply(data)
      for (const f of all) f.clear()
      alert.show(doneMessage, 'info')
    })
  })

  return {
    form,
    reset() {
      for (const f of all) {
        f.clear()
        f.setError(null)
      }
      alert.hide()
    },
  }
}

function passwordSection(getData, onSave) {
  const next = field({ label: 'Contraseña nueva', type: 'password', autocomplete: 'new-password', hint: 'Mínimo 6 caracteres.' })
  const repeat = field({ label: 'Repite la contraseña nueva', type: 'password', autocomplete: 'new-password' })
  const { form, reset } = secretForm(getData, {
    submitLabel: 'Cambiar contraseña',
    fields: [next, repeat],
    validate: () => {
      const e = passwordErrors(next.value, repeat.value)
      return [e.password, e.passwordRepeat]
    },
    apply: async (data) => onSave({ ...data, auth: { ...data.auth, password: await hashSecret(next.value) } }),
    doneMessage: 'Contraseña cambiada.',
  })
  const el = section('Contraseña', form)
  return {
    el,
    reset() {
      reset()
      el.open = false
    },
  }
}

function codeSection(getData, onSave) {
  const next = field({ label: 'Código nuevo', type: 'password', autocomplete: 'off', hint: 'Mínimo 6 caracteres, distinto de la contraseña.' })
  const repeat = field({ label: 'Repite el código nuevo', type: 'password', autocomplete: 'off' })
  const { form, reset } = secretForm(getData, {
    submitLabel: 'Cambiar código',
    fields: [next, repeat],
    validate: (currentPassword) => {
      const e = codeErrors(next.value, repeat.value, currentPassword)
      return [e.code, e.codeRepeat]
    },
    apply: async (data) => onSave({ ...data, auth: { ...data.auth, recovery: await hashSecret(next.value) } }),
    doneMessage: 'Código de recuperación cambiado. Anota el nuevo en un lugar seguro.',
  })
  const el = section('Código de recuperación', form)
  return {
    el,
    reset() {
      reset()
      el.open = false
    },
  }
}

function lockSection(getData, onSave) {
  const alert = alertBox()
  const saved = h('p', { class: 'saved', role: 'status' })
  const select = h('select', { class: 'select' }, ...LOCK_OPTIONS.map((m) => h('option', { value: m }, `${m} minutos`)))
  select.value = String(getData().settings.lockMinutes)

  select.addEventListener('change', async () => {
    saved.textContent = ''
    alert.hide()
    const data = getData()
    try {
      await onSave({ ...data, settings: { ...data.settings, lockMinutes: Number(select.value) } })
      saved.textContent = 'Guardado.'
    } catch (error) {
      alert.show(error instanceof Error ? error.message : 'No se pudo guardar.')
    }
  })

  return {
    el: h(
      'section',
      { class: 'section', style: 'padding-top: 1rem' },
      h('h3', { class: 'section-title' }, 'Bloqueo automático'),
      h('label', { class: 'lock-row' }, 'Bloquear la app después de', select, 'sin usarla.'),
      saved,
      alert.el,
    ),
    reset() {
      saved.textContent = ''
      alert.hide()
      select.value = String(getData().settings.lockMinutes)
    },
  }
}
