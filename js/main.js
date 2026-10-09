// Entry point: decides which screen to show and moves between them.
import { hashSecret, verifySecret } from './data/auth.js'
import { createDataFile, ensureAccess, fileAccessSupported, openFile, readDataFile, rememberFile, rememberedFile, writeDataFile } from './data/file.js'
import { applyImport, readImport } from './data/import.js'
import { createSaver } from './data/saver.js'
import { newDataFile } from './data/store.js'
import { startIdleLock, stopIdleLock } from './idle.js'
import { forgotScreen } from './screens/forgot.js'
import { frame, stepTitle } from './screens/frame.js'
import { importPanel } from './screens/importar.js'
import { gateScreen } from './screens/gate.js'
import { setupScreen } from './screens/setup.js'
import { ajustesView } from './screens/ajustes.js'
import { asignaturasView } from './screens/asignaturas.js'
import { gruposView } from './screens/grupos.js'
import { notasView } from './screens/notas.js'
import { saveStatusEl, shellScreen } from './screens/shell.js'
import { startScreen } from './screens/start.js'
import { unsupportedScreen } from './screens/unsupported.js'
import { h, mount } from './ui/dom.js'
import { setPref } from './ui/prefs.js'

// Offline support only on the published site. While reviewing locally (Five Server),
// every save should show up right away instead of a cached copy.
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('sw.js')

/** Once the person is in: the open file, its data, and the queue that saves it. */
let session = null
let view = 'notas'
let saveStatus = null
const VIEWS = { notas: notasView, grupos: gruposView, asignaturas: asignaturasView, ajustes: ajustesView }

// What the sections use to read and change the data.
const app = {
  get data() {
    return session.data
  },
  /** Applies a change right away; it is written to the file in the background. */
  commit(next) {
    const lockChanged = next.settings.lockMinutes !== session.data.settings.lockMinutes
    session.data = next
    session.saver.save(next)
    if (lockChanged) startIdleLock(next.settings.lockMinutes, lock)
  },
  /** Same, but waits until it's on disk (used for password changes). */
  async commitNow(next) {
    app.commit(next)
    await session.saver.settled()
  },
  go(name) {
    view = name
    showApp()
  },
  /** Redraws the current section, optionally focusing an element marked data-focus-key. */
  refresh(focusKey) {
    showApp(focusKey)
  },
  lock: () => lock(),
  retrySave: () => session.saver.retry(),
  /** Asks for a table and shows what it would add to the open file. */
  async importTable() {
    const opened = await openFile()
    if (opened.kind !== 'table') throw new Error('Ese es un archivo de Notas NMA, no una tabla. Elige un .xlsx, .csv o .txt con las columnas Nombre, Grado y Curso.')
    const preview = readImport(session.data, opened.sheets)
    const content = h(
      'div',
      { class: 'settings' },
      h('h1', { class: 'page-title' }, 'Importar tabla'),
      importPanel({
        data: session.data,
        fileName: opened.name,
        preview,
        confirmLabel: 'Importar',
        onConfirm: async (period) => {
          app.commit(applyImport(session.data, preview, period))
          if (period) setPref('period', period)
          app.go('notas')
        },
        onCancel: () => app.go('notas'),
      }),
    )
    mount(shellScreen({ app, view: 'notas', content, saveStatus }))
  },
}

function showSaveStatus(status) {
  saveStatus = status
  document.getElementById('save-status')?.replaceWith(saveStatusEl(app, status))
}

// Closing the window while a save is still running would lose the last change.
window.addEventListener('beforeunload', (event) => {
  if (session?.saver.pending) event.preventDefault()
})

// The person's name, kept outside the data file so the login can greet them
// before the browser grants access to the file.
const NAME_KEY = 'nma.name'
function rememberedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
function rememberName(name) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Only affects the greeting.
  }
}
const firstName = (name) => name.split(' ')[0]

async function boot() {
  if (!fileAccessSupported()) return mount(unsupportedScreen())
  const handle = await rememberedFile()
  if (handle) showLogin(handle)
  else showStart()
}

function showStart() {
  mount(
    startScreen({
      onCreate: async () => {
        const data = newDataFile(new Date().getFullYear())
        const handle = await createDataFile(data)
        showSetup(handle, data)
      },
      onOpen: openOther,
    }),
  )
}

async function openOther() {
  const opened = await openFile()
  if (opened.kind === 'table') return showImportStart(opened)
  await rememberFile(opened.handle)
  if (opened.data.auth) showLogin(opened.handle)
  else showSetup(opened.handle, opened.data)
}

// A table opened before there is a data file: the import becomes a new data file.
function showImportStart({ name, sheets }) {
  const empty = newDataFile(new Date().getFullYear())
  const preview = readImport(empty, sheets)
  mount(
    frame(
      stepTitle('Importar tabla'),
      importPanel({
        data: empty,
        fileName: name,
        preview,
        confirmLabel: 'Crear archivo de notas',
        onConfirm: async (period) => {
          const data = applyImport(empty, preview, period)
          const handle = await createDataFile(data)
          if (period) setPref('period', period)
          showSetup(handle, data)
        },
        onCancel: () => boot(),
      }),
    ),
  )
}

function showLogin(handle) {
  const name = rememberedName()
  mount(
    gateScreen({
      title: name ? `Hola, ${firstName(name)}` : 'Ingresar',
      userName: name,
      fileName: handle.name,
      submitLabel: 'Ingresar',
      onSubmit: async (password) => {
        await ensureAccess(handle)
        const data = await readDataFile(handle)
        // No auth block (deleted as a last-resort reset): set up access again, keeping every grade.
        if (data.auth && !(await verifySecret(password, data.auth.password))) return false
        enter(handle, data)
        return true
      },
      onForgot: () => showForgot(handle, () => showLogin(handle)),
      onOtherFile: openOther,
    }),
  )
}

function showForgot(handle, back) {
  mount(
    forgotScreen({
      fileName: handle.name,
      userName: rememberedName(),
      onSubmit: async (code, newPassword) => {
        await ensureAccess(handle)
        const data = await readDataFile(handle)
        if (!data.auth) {
          enter(handle, data)
          return true
        }
        if (!(await verifySecret(code, data.auth.recovery))) return false
        const next = { ...data, auth: { ...data.auth, password: await hashSecret(newPassword) } }
        await writeDataFile(handle, next)
        enter(handle, next)
        return true
      },
      onBack: back,
    }),
  )
}

function showSetup(handle, data) {
  mount(
    setupScreen({
      fileName: handle.name,
      onSubmit: async ({ name, password, code }) => {
        await ensureAccess(handle) // first, while the click still counts as the person's action
        const auth = { name: name.trim(), password: await hashSecret(password), recovery: await hashSecret(code) }
        const next = { ...data, auth }
        await writeDataFile(handle, next)
        enter(handle, next)
      },
    }),
  )
}

function enter(handle, data) {
  if (!data.auth) return showSetup(handle, data)
  rememberName(data.auth.name)
  session = { handle, data, saver: createSaver((next) => writeDataFile(handle, next), showSaveStatus) }
  showApp()
}

function showApp(focusKey) {
  const scroll = focusKey ? window.scrollY : 0
  const content = VIEWS[view](app)
  mount(shellScreen({ app, view, content, saveStatus }))
  if (focusKey) {
    window.scrollTo(0, scroll)
    document.querySelector(`[data-focus-key="${focusKey}"]`)?.focus({ preventScroll: true })
  }
  startIdleLock(session.data.settings.lockMinutes, lock)
}

function lock() {
  stopIdleLock()
  document.querySelector('dialog[open]')?.close()
  const { handle, data } = session
  mount(
    gateScreen({
      title: 'Sesión bloqueada',
      userName: data.auth.name,
      fileName: handle.name,
      submitLabel: 'Desbloquear',
      onSubmit: async (password) => {
        if (!(await verifySecret(password, data.auth.password))) return false
        showApp()
        return true
      },
      onForgot: () => showForgot(handle, lock),
    }),
  )
}

boot()
