# Notas NMA

Registro de notas y boletines de la Institución Educativa Nicanor Montero Arias.
Offline Progressive Web App in plain HTML, CSS and JavaScript: no Node, no install, no build step.
Product plan and status: [plan.md](plan.md).

## Review it

Open `index.html` with **Five Server** (or Live Server) in **Chrome or Edge**.
Saving to a file on the PC only works in those two browsers.

Opening the file directly (double-click, `file://`) does not work: the browser blocks
JavaScript modules and file access there. It needs a local server, which is what Five Server is.

## Tests

With Five Server running, open `/tests/` (e.g. `http://127.0.0.1:5500/tests/`).
The page title shows ✓ or ✗ and the list shows each test.

## Publish

Push to GitHub and connect the repo to Vercel (no build settings needed: it serves the files as they are).
Offline mode (the service worker in `sw.js`) only turns on on the published site, never while reviewing locally,
so Five Server always shows the latest code. A new version reaches the school PC the next time
the app is opened with internet.

If you add a new file the app needs offline, also add it to the `FILES` list in `sw.js`.

## Branding

- Escudo: put the image in `brand/` (e.g. `brand/escudo.png`) and set `logoSrc` in `js/brand.js`.
- Colors: `css/styles.css` (`:root`).

## Layout

```
index.html            the page
css/styles.css        all styles
js/main.js            decides which screen to show
js/screens/           one file per screen
js/ui/                small building blocks (fields, buttons, seal)
js/data/              data file format, file access, password hashing
sw.js                 offline support
tests/                in-browser tests
fonts/, icons/, brand/
```
