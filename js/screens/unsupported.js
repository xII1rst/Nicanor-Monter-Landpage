import { h } from '../ui/dom.js'
import { frame, stepTitle } from './frame.js'

export function unsupportedScreen() {
  return frame(
    stepTitle('Abre la app en Chrome o Edge'),
    h(
      'p',
      { class: 'lead' },
      'Notas NMA guarda las notas en un archivo de este computador, y solo Google Chrome y Microsoft Edge pueden hacerlo. Edge ya viene instalado en Windows.',
    ),
  )
}
