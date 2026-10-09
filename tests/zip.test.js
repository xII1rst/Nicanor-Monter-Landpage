import { describe, expect, it } from './runner.js'
import { crc32, readZip, writeZip } from '../js/data/zip.js'

const utf8 = (text) => new TextEncoder().encode(text)
const text = async (entries, name) => new TextDecoder().decode(await entries.get(name)())

describe('crc32', () => {
  it('gives the standard checksum zip files need', () => {
    expect(crc32(utf8('hello'))).toBe(0x3610a686)
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('writeZip and readZip', () => {
  it('write files that read back the same, in the same order', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255, 7])
    const zip = await writeZip([
      { name: '[Content_Types].xml', bytes: utf8('<Types/>') },
      { name: 'word/document.xml', bytes: utf8('<w:t>Año: niño ñandú</w:t>'.repeat(50)) },
      { name: 'word/media/escudo.png', bytes: png },
    ])
    const entries = readZip(zip)
    expect([...entries.keys()]).toEqual(['[Content_Types].xml', 'word/document.xml', 'word/media/escudo.png'])
    expect(await text(entries, 'word/document.xml')).toBe('<w:t>Año: niño ñandú</w:t>'.repeat(50))
    expect([...(await entries.get('word/media/escudo.png')())]).toEqual([...png])
  })

  it('refuses bytes that are not a zip', () => {
    expect(() => readZip(utf8('lista de compras'))).toThrow('zip')
  })
})
