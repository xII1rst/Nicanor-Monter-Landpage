// The data file lives on the PC (any name; new ones are suggested as notas-nma-<year>.txt).
// The browser remembers which file it is between sessions; access is granted with one
// "Permitir" click per session (File System Access API: Chrome and Edge).
// Opening also accepts tables (.csv, .txt, .xlsx) to import; their content decides which is which.
import { parseDataFile, serializeDataFile } from './store.js'
import { decodeText, detectSeparator, parseDelimited } from './table.js'
import { readXlsx } from './xlsx.js'

const HANDLE_KEY = 'data-file'
const saveTypes = [{ description: 'Archivo de Notas NMA', accept: { 'text/plain': ['.txt'] } }]
const openTypes = [
  {
    description: 'Notas NMA o tablas (.txt, .csv, .xlsx)',
    accept: { 'text/plain': ['.txt'], 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
  },
]

// Minimal IndexedDB key-value store: the file handle can't go in localStorage.
function idb(mode, request) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('notas-nma', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('kv')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode)
      const req = request(tx.objectStore('kv'))
      tx.oncomplete = () => {
        open.result.close()
        resolve(req.result)
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}
export const rememberFile = (handle) => idb('readwrite', (store) => store.put(handle, HANDLE_KEY))

export const fileAccessSupported = () => 'showOpenFilePicker' in window && 'showSaveFilePicker' in window

/** @returns {Promise<FileSystemFileHandle | undefined>} */
export async function rememberedFile() {
  try {
    return await idb('readonly', (store) => store.get(HANDLE_KEY))
  } catch {
    return undefined
  }
}

export async function createDataFile(data) {
  const handle = await window.showSaveFilePicker({ suggestedName: `notas-nma-${data.settings.year}.txt`, types: saveTypes, startIn: 'documents' })
  await writeDataFile(handle, data)
  await rememberFile(handle)
  return handle
}

/**
 * Asks for any file and reads it: a Notas NMA file → { kind: 'notas', handle, data };
 * a table → { kind: 'table', name, sheets: [{ name, rows }] } (sheet names only for .xlsx).
 */
export async function openFile() {
  const [handle] = await window.showOpenFilePicker({ types: openTypes, startIn: 'documents' })
  const bytes = new Uint8Array(await (await handle.getFile()).arrayBuffer())
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return { kind: 'table', name: handle.name, sheets: await readXlsx(bytes) }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new Error('Este archivo es de una versión antigua de Excel (.xls). Ábrelo en Excel y guárdalo como .xlsx o .csv.')
  }
  const text = decodeText(bytes)
  if (text.trimStart().startsWith('{')) return { kind: 'notas', handle, data: parseDataFile(text) }
  return { kind: 'table', name: handle.name, sheets: [{ name: null, rows: parseDelimited(text, detectSeparator(text)) }] }
}

/** Call from a click or submit handler: the browser may ask "Permitir" first. */
export async function ensureAccess(handle) {
  const mode = { mode: 'readwrite' }
  if ((await handle.queryPermission(mode)) === 'granted') return
  if ((await handle.requestPermission(mode)) !== 'granted') {
    throw new Error('La app necesita permiso para usar el archivo de notas. Pulsa "Permitir" cuando el navegador lo pregunte.')
  }
}

export async function readDataFile(handle) {
  const file = await handle.getFile()
  return parseDataFile(await file.text())
}

export async function writeDataFile(handle, data) {
  const writable = await handle.createWritable()
  await writable.write(serializeDataFile(data))
  await writable.close()
}

/** True when the person closed a file picker without choosing; not an error worth showing. */
export const isCancel = (error) => error instanceof DOMException && error.name === 'AbortError'

export function fileErrorMessage(error, fileName) {
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return `No se encontró ${fileName ?? 'el archivo de notas'}. Puede que se haya movido o borrado. Ábrelo desde su ubicación actual con "Usar otro archivo".`
  }
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo usar el archivo de notas.'
}
