// Offline support. Cache-first: the app opens instantly from the copy saved on the PC.
// In the background, while online, each file is fetched again and the copy updated,
// so a new version (pushed to the repo) shows up the next time the app is opened.
// Only registered on the published site (see js/main.js), never while reviewing locally.

const CACHE = 'notas-nma'

// Saved on install so the whole app works offline right after the first visit.
// New files not listed here still get cached the first time they're used.
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'favicon.png',
  'brand/escudo.png',
  'css/styles.css',
  'fonts/alegreya-latin.woff2',
  'fonts/alegreya-latin-ext.woff2',
  'fonts/alegreya-italic-latin.woff2',
  'fonts/archivo-latin.woff2',
  'fonts/archivo-latin-ext.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/main.js',
  'js/brand.js',
  'js/attempts.js',
  'js/idle.js',
  'js/data/auth.js',
  'js/data/file.js',
  'js/data/grades.js',
  'js/data/import.js',
  'js/data/missing.js',
  'js/data/model.js',
  'js/data/paste.js',
  'js/data/saver.js',
  'js/data/store.js',
  'js/data/table.js',
  'js/data/xlsx.js',
  'js/ui/confirm.js',
  'js/ui/controls.js',
  'js/ui/dom.js',
  'js/ui/guard.js',
  'js/ui/prefs.js',
  'js/ui/escudo.js',
  'js/screens/ajustes.js',
  'js/screens/asignaturas.js',
  'js/screens/forgot.js',
  'js/screens/frame.js',
  'js/screens/gate.js',
  'js/screens/grupos.js',
  'js/screens/importar.js',
  'js/screens/notas.js',
  'js/screens/security.js',
  'js/screens/setup.js',
  'js/screens/shell.js',
  'js/screens/start.js',
  'js/screens/unsupported.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true })
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => undefined) // offline: the cached copy is all there is
      if (cached) {
        event.waitUntil(fresh)
        return cached
      }
      return (await fresh) ?? Response.error()
    }),
  )
})
