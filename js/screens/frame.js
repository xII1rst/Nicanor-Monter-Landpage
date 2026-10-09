import { brand } from '../brand.js'
import { h } from '../ui/dom.js'
import { escudo } from '../ui/escudo.js'

// Shared layout for every screen before entering the app: the school's escudo,
// its name and sign, and the current step (login, setup, recovery…).
export function frame(...step) {
  return h(
    'main',
    { class: 'frame' },
    h('div', { class: 'frame-escudo' }, escudo()),
    h(
      'div',
      { class: 'frame-main' },
      h('h1', { class: 'school' }, h('span', { class: 'school-type' }, brand.schoolType), h('span', { class: 'school-name' }, brand.schoolProperName)),
      h('p', { class: 'motto' }, brand.motto),
      h('div', { class: 'step' }, ...step),
    ),
  )
}

export const stepTitle = (text) => h('h2', { class: 'step-title' }, text)
