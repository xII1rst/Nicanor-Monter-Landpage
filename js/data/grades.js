// Grades are numbers from 0 to 100 (one decimal only when Ajustes allows it).
// Each grade maps to a desempeño (Decreto 1290): Bajo, Básico, Alto, Superior.

const LEVEL_NAMES = ['Bajo', 'Básico', 'Alto', 'Superior']
const round1 = (n) => Math.round(n * 10) / 10

/** Reads what was typed in a grade cell: { value } (null when empty) or { error }. */
export function parseGrade(text, { decimals }) {
  const raw = text.trim()
  if (!raw) return { value: null }
  if (!/^\d+([.,]\d+)?$/.test(raw)) return { error: 'Escribe un número de 0 a 100.' }
  const value = Number(raw.replace(',', '.'))
  if (value > 100) return { error: 'La nota máxima es 100.' }
  if (!Number.isInteger(value)) {
    if (!decimals) return { error: 'Usa números enteros: los decimales están desactivados en Ajustes.' }
    if (!/^\d+[.,]\d$/.test(raw)) return { error: 'Usa máximo un decimal.' }
  }
  return { value }
}

/** Ranges from the minimum grade of Básico, Alto and Superior (Bajo always starts at 0). */
export function levelsFromMins({ basico, alto, superior }, decimals) {
  const mins = [0, basico, alto, superior]
  if (mins.slice(1).some((m) => !Number.isFinite(m) || m < 1 || m > 100)) throw new Error('Los mínimos deben estar entre 1 y 100.')
  if (!(basico < alto && alto < superior)) throw new Error('Los mínimos deben ir de menor a mayor.')
  const step = decimals ? 0.1 : 1
  return LEVEL_NAMES.map((name, i) => ({ name, min: mins[i], max: i < 3 ? round1(mins[i + 1] - step) : 100 }))
}

export const levelFor = (score, levels) => levels.findLast((level) => score >= level.min)?.name

/** Mean of the grades that exist, to one decimal; null when there are none. */
export function average(values) {
  const grades = values.filter((v) => v != null)
  if (grades.length === 0) return null
  return round1(grades.reduce((sum, v) => sum + v, 0) / grades.length)
}

export const formatGrade = (value) => (value == null ? '' : String(value).replace('.', ','))
