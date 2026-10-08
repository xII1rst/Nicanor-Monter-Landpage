import { brand } from '../brand.js'
import { h } from './dom.js'

let landed = false // the entrance plays once per page load, not on every screen change

/** The school's escudo, large, for the welcome screens. */
export function escudo() {
  const img = h('img', { src: brand.escudo, alt: `Escudo de la ${brand.schoolName}`, class: landed ? 'escudo' : 'escudo landing' })
  landed = true
  return img
}

/** Small version for the app header (decorative: the school name is already on screen). */
export const escudoMark = () => h('img', { src: brand.escudo, alt: '', class: 'mark' })
