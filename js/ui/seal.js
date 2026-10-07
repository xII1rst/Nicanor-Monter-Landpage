import { brand } from '../brand.js'
import { uid } from './dom.js'

// The school's rubber stamp. The ring carries the name; the center circle is
// the escudo slot (brand.logoSrc). Until the escudo arrives it shows "NMA".
// Only brand constants go into this markup, never data from the file.

let stamped = false // the stamp animation plays once per page load, not on every screen

export function seal() {
  const id = uid('seal')
  const wrapper = document.createElement('div')
  const center = brand.logoSrc
    ? `<image href="${brand.logoSrc}" x="52" y="52" width="136" height="136" clip-path="url(#${id}-slot)" preserveAspectRatio="xMidYMid meet" />`
    : ''
  const monogram = brand.logoSrc
    ? ''
    : `<text x="120" y="121" fill="currentColor" stroke="none" font-size="40" text-anchor="middle" dominant-baseline="central" style="font-family: var(--font-display); font-weight: 600; letter-spacing: 0.04em">NMA</text>`

  wrapper.innerHTML = `
    <svg viewBox="0 0 240 240" class="seal${stamped ? '' : ' stamping'}" role="img" aria-label="Sello de la ${brand.schoolName}">
      <defs>
        <!-- Uneven, slightly worn ink, like a real stamp pressed by hand. -->
        <filter id="${id}-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="7" result="blotch" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.2" result="rough" />
          <feColorMatrix in="blotch" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.62" result="wear" />
          <feComposite in="rough" in2="wear" operator="in" />
        </filter>
        <!-- The name runs across 270° of the ring, from about 7:30 to 4:30 on a clock face. -->
        <path id="${id}-ring" d="M 55.65 184.35 A 91 91 0 1 1 184.35 184.35" />
        <clipPath id="${id}-slot"><circle cx="120" cy="120" r="68" /></clipPath>
      </defs>
      <g filter="url(#${id}-ink)" fill="none" stroke="var(--sello)" style="color: var(--sello)">
        <circle cx="120" cy="120" r="114" stroke-width="3.2" />
        <circle cx="120" cy="120" r="108" stroke-width="1" />
        <circle cx="120" cy="120" r="74" stroke-width="1.6" />
        <g fill="currentColor" stroke="none" style="font-family: var(--font-sans); font-stretch: 75%; font-weight: 650">
          <text font-size="15" letter-spacing="0.8">
            <textPath href="#${id}-ring" startOffset="50%" text-anchor="middle">${brand.schoolName.toLocaleUpperCase('es')}</textPath>
          </text>
          <text x="120" y="211" font-size="12" text-anchor="middle" dominant-baseline="central">★</text>
        </g>
        ${monogram}
      </g>
      ${center}
    </svg>`
  stamped = true
  return wrapper.firstElementChild
}

/** Small version for tight spaces (app header): the ring text would be illegible there. */
export function sealMark() {
  if (brand.logoSrc) {
    const img = document.createElement('img')
    img.src = brand.logoSrc
    img.alt = ''
    img.className = 'mark'
    img.style.objectFit = 'contain'
    return img
  }
  const wrapper = document.createElement('div')
  wrapper.innerHTML = `
    <svg viewBox="0 0 48 48" class="mark" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="var(--sello)" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke="#fff" stroke-width="1.2" />
      <text x="24" y="24.5" fill="#fff" font-size="12.5" text-anchor="middle" dominant-baseline="central" style="font-family: var(--font-display); font-weight: 650">NMA</text>
    </svg>`
  return wrapper.firstElementChild
}
