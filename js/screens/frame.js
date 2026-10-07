import { brand } from '../brand.js'
import { h } from '../ui/dom.js'
import { seal } from '../ui/seal.js'

// Shared layout for every screen before entering the app: the school's seal,
// its name, and the current step (login, setup, recovery…).
export function frame(...step) {
  return h(
    'main',
    { class: 'frame' },
    h('div', { class: 'frame-seal' }, seal()),
    h(
      'div',
      { class: 'frame-main' },
      h('h1', { class: 'school' }, h('span', { class: 'school-type' }, brand.schoolType), h('span', { class: 'school-name' }, brand.schoolProperName)),
      h('div', { class: 'step' }, ...step),
    ),
  )
}

export const stepTitle = (text) => h('h2', { class: 'step-title' }, text)
