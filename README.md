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

## From notas to boletines

1. **Notas**: pick the group and periodo, then enter the grades. The earlier periods stay
   visible beside each box; every change saves to the data file.
2. **Objetivos**: write the objectives for each subject of that group and periodo,
   one objective per line. **Copiar de otro grupo** copies the objectives of shared
   subjects for the same periodo and asks before replacing objectives already written.
3. **Comportamiento**: enter each student's comportamiento social and observaciones
   for that periodo. These fields can stay blank.
4. **Boletines**: pick the group and periodo and review the missing notas by student
   and the subjects without objetivos. The links return to the same group and periodo
   to complete them. Click **Hacer boletín** when complete, or **Generar de todos modos**
   to leave missing fields blank.

The download is a single Word file, e.g. `Boletines 1°01 - Periodo 3.docx`, with students
in alphabetical order, each starting on a new page. It includes the notas of periods
1 through the selected periodo (later columns stay blank), that periodo's desempeño,
objetivos, comportamiento and observaciones, and the escala configured in Ajustes.
A group needs students and assigned subjects before generating. The template and
generator are included for offline use; no external library or online service is needed.

Groups cover **Transición, 1°–5° and CLEI 3–6**. Jornada comes from the grado:
**Única** for primaria and **Sabatina** for CLEI. CLEI currently uses the same four
periodos and scale, pending the school's confirmation.

## Check on the school PC

Still pending: in **Word on the school PC**, open a generated `.docx` and check the
print preview. If Word opens it in **Vista protegida**, choose **Habilitar edición**.
Check Colombian **oficio (21.6 × 33 cm / 8.5 × 13 in)**, Tw Cen MT fonts, accents,
one page per student, and the longest objectives, comportamiento and observaciones.
Verify the group, periodo, earlier notas, desempeño and signatures, then print a sample.
Local LibreOffice rendering does not replace this Word/printer check.

## Tests

With Five Server running, open `/tests/` (e.g. `http://127.0.0.1:5500/tests/`).
The page title shows ✓ or ✗ and the list shows each test.

Verified locally on 2026-10-09: **152 browser tests**, plus the Chrome workflow from
table import and setup through incomplete/complete Word downloads, a second periodo,
objetivos and comportamiento, CLEI, empty groups, template failure/retry, lock/login,
saved-file reload and offline generation, at 1366 px and 375 px. Automated file picker
dialogs used temporary browser file handles; the school PC's native permission dialogs
and Word/printer check remain manual. Downloaded files passed ZIP/XML validation;
LibreOffice rendering showed one oficio page per student, including a ten-subject
primaria example with two long objectives per subject.

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
                      tables/import, missing notas/objetivos, Word generation (boletin.js)
templates/boletin.docx the school's template with placeholders and no student data
sw.js                 offline support
tests/                in-browser tests
fonts/, icons/, brand/
```
