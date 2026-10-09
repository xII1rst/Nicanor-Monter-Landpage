import { describe, expect, it } from './runner.js'
import { readXlsx } from '../js/data/xlsx.js'

// A .xlsx is a zip of XML files. This builds one in memory the way Excel lays it out,
// so the tests don't depend on a file on disk.
async function zip(files, { stored = [] } = {}) {
  const encoder = new TextEncoder()
  const entries = []
  for (const [path, text] of Object.entries(files)) {
    const raw = encoder.encode(text)
    const deflate = !stored.includes(path)
    const body = deflate ? new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()) : raw
    entries.push({ name: encoder.encode(path), raw, body, method: deflate ? 8 : 0 })
  }
  const parts = []
  const central = []
  let offset = 0
  for (const e of entries) {
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(8, e.method, true)
    local.setUint32(18, e.body.length, true)
    local.setUint32(22, e.raw.length, true)
    local.setUint16(26, e.name.length, true)
    parts.push(new Uint8Array(local.buffer), e.name, e.body)
    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(10, e.method, true)
    dir.setUint32(20, e.body.length, true)
    dir.setUint32(24, e.raw.length, true)
    dir.setUint16(28, e.name.length, true)
    dir.setUint32(42, offset, true)
    central.push(new Uint8Array(dir.buffer), e.name)
    offset += 30 + e.name.length + e.body.length
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)
  return new Uint8Array(await new Blob([...parts, ...central, new Uint8Array(end.buffer)]).arrayBuffer())
}

const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="1°01" sheetId="1" r:id="rId1"/><sheet name="Notas &amp; más" sheetId="2" r:id="rId3"/></sheets></workbook>`

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet2.xml"/>
</Relationships>`

const sharedStrings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="5" uniqueCount="5">
<si><t>Nombre</t></si><si><t>Grado</t></si><si><t>Curso</t></si>
<si><r><t xml:space="preserve">ROJAS </t></r><r><rPr><b/></rPr><t>MEJÍA SARA</t></r><rPh sb="0" eb="1"><t>X</t></rPh></si>
<si><t>Lengua &amp; Literatura</t></si>
</sst>`

const sheet1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="30"/></cols><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="inlineStr"><is><t>Matemáticas</t></is></c><c r="E1" t="s"><v>4</v></c></row>
<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3"><v>1</v></c><c r="C3" t="str"><f>"0"&amp;B3</f><v>01</v></c><c r="D3" s="2"><v>8.4000000000000004</v></c><c r="E3" s="2"/></row>
</sheetData></worksheet>`

const sheet2 = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="B1" t="inlineStr"><is><t>solo B</t></is></c></row></sheetData></worksheet>`

const book = (options) => zip({ 'xl/workbook.xml': workbook, 'xl/_rels/workbook.xml.rels': rels, 'xl/sharedStrings.xml': sharedStrings, 'xl/worksheets/sheet1.xml': sheet1, 'xl/worksheets/sheet2.xml': sheet2 }, options)

describe('readXlsx', () => {
  it('reads every sheet with its name, in the order of the workbook', async () => {
    const sheets = await readXlsx(await book())
    expect(sheets.map((s) => s.name)).toEqual(['1°01', 'Notas & más'])
  })

  it('reads shared text (rich text joined), inline text, numbers and formula results', async () => {
    const [first] = await readXlsx(await book())
    expect(first.rows).toEqual([
      ['Nombre', 'Grado', 'Curso', 'Matemáticas', 'Lengua & Literatura'],
      [],
      ['ROJAS MEJÍA SARA', '1', '01', '8.4000000000000004', ''],
    ])
  })

  it('puts a cell in its column even when the cells before it are missing', async () => {
    const [, second] = await readXlsx(await book())
    expect(second.rows).toEqual([['', 'solo B']])
  })

  it('also reads files saved without compression', async () => {
    const sheets = await readXlsx(await book({ stored: ['xl/worksheets/sheet1.xml', 'xl/sharedStrings.xml'] }))
    expect(sheets[0].rows[2][0]).toBe('ROJAS MEJÍA SARA')
  })

  it('refuses a zip that is not an Excel file', async () => {
    let message = ''
    try {
      await readXlsx(await zip({ 'hola.txt': 'hola' }))
    } catch (error) {
      message = error.message
    }
    expect(message).toContain('no es un archivo de Excel')
  })
})
