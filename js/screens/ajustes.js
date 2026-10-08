import { levelsFromMins } from '../data/grades.js'
import { hasDecimalGrades } from '../data/model.js'
import { serializeDataFile } from '../data/store.js'
import { alertBox, button } from '../ui/controls.js'
import { h, uid } from '../ui/dom.js'
import { securityDialog } from './security.js'

export function ajustesView(app) {
  const security = securityDialog({ getData: () => app.data, onSave: app.commitNow })
  return h(
    'div',
    { class: 'settings' },
    h('h1', { class: 'page-title' }, 'Ajustes'),
    h('div', { class: 'section-gap' }, yearBlock(app), levelsBlock(app), decimalsBlock(app), backupBlock(app), securityBlock(security)),
    security.el,
  )
}

function block(title, ...content) {
  return h('section', { class: 'block' }, h('h2', { class: 'block-title' }, title), ...content)
}

function numberInput(id, value, attrs = {}) {
  return h('input', { class: 'input input-narrow', id, type: 'number', inputmode: 'numeric', value, ...attrs })
}

function yearBlock(app) {
  const id = uid('year')
  const input = numberInput(id, app.data.settings.year, { min: 2000, max: 2100 })
  const alert = alertBox()
  const form = h(
    'form',
    { novalidate: true },
    h('div', { class: 'inline-fields' }, h('div', {}, h('label', { class: 'control-label', for: id }, 'Año'), input), button('Guardar', { type: 'submit', variant: 'secondary' })),
  )
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const year = Number(input.value)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return alert.show('Escribe un año entre 2000 y 2100.')
    app.commit({ ...app.data, settings: { ...app.data.settings, year } })
    alert.show('Año guardado.', 'info')
  })
  return block('Año escolar', form, h('div', { class: 'section-gap' }, alert.el))
}

function levelsBlock(app) {
  const { levels, decimals } = app.data.settings
  const ids = { basico: uid('basico'), alto: uid('alto'), superior: uid('superior') }
  const inputs = {
    basico: numberInput(ids.basico, levels[1].min, { min: 1, max: 100 }),
    alto: numberInput(ids.alto, levels[2].min, { min: 1, max: 100 }),
    superior: numberInput(ids.superior, levels[3].min, { min: 1, max: 100 }),
  }
  const ranges = h('ul', { class: 'ranges', 'aria-live': 'polite' })
  const alert = alertBox()
  const read = () => levelsFromMins({ basico: Number(inputs.basico.value), alto: Number(inputs.alto.value), superior: Number(inputs.superior.value) }, decimals)
  const show = (list) => ranges.replaceChildren(...list.map((l) => h('li', {}, `${l.name}: ${String(l.min).replace('.', ',')} a ${String(l.max).replace('.', ',')}`)))

  function preview() {
    try {
      show(read())
      alert.hide()
    } catch (error) {
      alert.show(error.message)
    }
  }
  show(levels)
  for (const input of Object.values(inputs)) input.addEventListener('input', preview)

  const form = h(
    'form',
    { novalidate: true },
    h(
      'div',
      { class: 'inline-fields' },
      h('div', {}, h('label', { class: 'control-label', for: ids.basico }, 'Básico desde'), inputs.basico),
      h('div', {}, h('label', { class: 'control-label', for: ids.alto }, 'Alto desde'), inputs.alto),
      h('div', {}, h('label', { class: 'control-label', for: ids.superior }, 'Superior desde'), inputs.superior),
      button('Guardar', { type: 'submit', variant: 'secondary' }),
    ),
  )
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      app.commit({ ...app.data, settings: { ...app.data.settings, levels: read() } })
      alert.show('Desempeños guardados.', 'info')
    } catch (error) {
      alert.show(error.message)
    }
  })
  return block('Desempeños', h('p', { class: 'hint' }, 'Nota mínima de cada desempeño. Bajo va desde 0.'), form, ranges, h('div', { class: 'section-gap' }, alert.el))
}

function decimalsBlock(app) {
  const box = h('input', { type: 'checkbox', checked: app.data.settings.decimals })
  const alert = alertBox()
  box.addEventListener('change', () => {
    const decimals = box.checked
    const data = app.data
    if (!decimals && hasDecimalGrades(data)) {
      box.checked = true
      return alert.show('Hay notas con decimales. Cámbialas por números enteros antes de desactivar esta opción.')
    }
    alert.hide()
    const [, basico, alto, superior] = data.settings.levels.map((l) => l.min)
    app.commit({ ...data, settings: { ...data.settings, decimals, levels: levelsFromMins({ basico, alto, superior }, decimals) } })
  })
  return block('Decimales', h('label', { class: 'check section-gap' }, box, 'Permitir notas con un decimal (por ejemplo 85,5)'), h('div', { class: 'section-gap' }, alert.el))
}

function backupBlock(app) {
  const download = () => {
    const data = app.data
    const today = new Date().toLocaleDateString('sv') // YYYY-MM-DD
    const blob = new Blob([serializeDataFile(data)], { type: 'text/plain' })
    const link = h('a', { href: URL.createObjectURL(blob), download: `notas-nma-${data.settings.year}-copia-${today}.txt` })
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }
  return block(
    'Copia de seguridad',
    h('p', { class: 'hint' }, 'Descarga una copia del archivo de notas para guardarla en una USB.'),
    h('div', { class: 'section-gap' }, button('Guardar copia', { variant: 'secondary', onclick: download })),
  )
}

function securityBlock(security) {
  return block(
    'Seguridad',
    h('p', { class: 'hint' }, 'Contraseña, código de recuperación y bloqueo automático.'),
    h('div', { class: 'section-gap' }, button('Abrir', { variant: 'secondary', onclick: security.open })),
  )
}
