# Notas NMA

Registro de notas y boletines de la Institución Educativa Nicanor Montero Arias.
Offline Progressive Web App in plain HTML, CSS and JavaScript: no Node, no install, no build step.

## Review it

Open `index.html` with **Five Server** (or Live Server) in **Chrome or Edge**.
Saving to a file on the PC only works in those two browsers.

Opening the file directly (double-click, `file://`) does not work: the browser blocks
JavaScript modules and file access there. It needs a local server, which is what Five Server is.

## Starting from a table

**Abrir archivo existente** (and **Importar tabla** on Notas) take any `.xlsx`, `.csv` or `.txt`
with a header row of **Nombre**, **Grado** and **Curso**, and one column per subject holding the notas
of one period (the app asks which). Example:

```
Nombre                 | Grado | Curso | Matemáticas | Lengua Castellana
ROJAS MEJÍA SARA  | 1°    | 01    | 8,4         | 6,9
```

Students already in the file are matched by name (case, accents and spaces don't matter),
so importing period 1, 2 and 3 tables one after another fills the same students.

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

- Escudo: `brand/escudo.png` (made from the school's scanned escudo, white background removed). Path set in `js/brand.js`.
- App icons and favicon (`icons/`, `favicon.png`) are made from the same escudo.
- Colors: `css/styles.css` (`:root`).

## Layout

```
index.html            the page
css/styles.css        all styles
js/main.js            decides which screen to show
js/screens/           one file per screen
js/ui/                small building blocks (fields, buttons, escudo)
js/data/              data file format, file access, password hashing,
                      reading tables (table.js, xlsx.js) and importing them (import.js)
sw.js                 offline support
tests/                in-browser tests
fonts/, icons/, brand/
```
