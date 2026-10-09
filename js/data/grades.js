// Grades go from 0.0 to 10.0 with at most one decimal (the school's scale).
// Each grade maps to a desempeño (Decreto 1290): Bajo, Básico, Alto, Superior.

const LEVEL_NAMES = ['Bajo', 'Básico', 'Alto', 'Superior']
const MAX = 10
const round1 = (n) => Math.round(n * 10) / 10

/** Reads what was typed in a grade cell: { value } (null when empty) or { error }. */
export function parseGrade(text) {
  const raw = text.trim()
  if (!raw) return { value: null }
  if (!/^\d+([.,]\d+)?$/.test(raw)) return { error: 'Escribe una nota de 0 a 10.' }
  const value = Number(raw.replace(',', '.'))
  if (value > MAX) return { error: 'La nota máxima es 10.' }
  if (!/^\d+([.,]\d)?$/.test(raw)) return { error: 'Usa máximo un decimal.' }
  return { value }
}

/** Ranges from the minimum grade of Básico, Alto and Superior (Bajo always starts at 0). */
export function levelsFromMins({ basico, alto, superior }) {
  const mins = [0, basico, alto, superior]
  if (mins.slice(1).some((m) => !Number.isFinite(m) || m < 0.1 || m > MAX)) throw new Error('Los mínimos deben estar entre 0,1 y 10.')
  if (mins.some((m) => round1(m) !== m)) throw new Error('Usa máximo un decimal en los mínimos.')
  if (!(basico < alto && alto < superior)) throw new Error('Los mínimos deben ir de menor a mayor.')
  return LEVEL_NAMES.map((name, i) => ({ name, min: mins[i], max: i < 3 ? round1(mins[i + 1] - 0.1) : MAX }))
}

export const levelFor = (score, levels) => levels.findLast((level) => score >= level.min)?.name

/** Mean of the grades that exist, to one decimal; null when there are none. */
export function average(values) {
  const grades = values.filter((v) => v != null)
  if (grades.length === 0) return null
  return round1(grades.reduce((sum, v) => sum + v, 0) / grades.length)
}

export const formatGrade = (value) => (value == null ? '' : value.toFixed(1).replace('.', ','))
