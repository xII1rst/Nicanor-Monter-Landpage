import { describe, expect, it } from './runner.js'
import { createSaver } from '../js/data/saver.js'

const tick = () => new Promise((r) => setTimeout(r, 0))

function slowWriter() {
  const writes = []
  let release = []
  const write = (data) =>
    new Promise((resolve, reject) => {
      writes.push(data)
      release.push({ resolve, reject })
    })
  return { writes, write, finish: () => release.shift().resolve(), fail: () => release.shift().reject(new Error('disco lleno')) }
}

describe('createSaver', () => {
  it('writes the data and reports saving, then saved', async () => {
    const statuses = []
    const w = slowWriter()
    const saver = createSaver(w.write, (s) => statuses.push(s))
    saver.save('v1')
    await tick()
    w.finish()
    await tick()
    expect(w.writes).toEqual(['v1'])
    expect(statuses).toEqual(['saving', 'saved'])
  })

  it('never writes twice at the same time, and skips versions already replaced', async () => {
    const w = slowWriter()
    const saver = createSaver(w.write)
    saver.save('v1')
    await tick()
    saver.save('v2')
    saver.save('v3')
    w.finish()
    await tick()
    expect(w.writes).toEqual(['v1', 'v3'])
    w.finish()
    await tick()
    expect(saver.pending).toBe(false)
  })

  it('reports a failed write and retries the latest data', async () => {
    const statuses = []
    const w = slowWriter()
    const saver = createSaver(w.write, (s) => statuses.push(s))
    saver.save('v1')
    await tick()
    w.fail()
    await tick()
    expect(statuses.at(-1)).toBe('error')
    expect(saver.pending).toBe(true)
    saver.retry()
    await tick()
    expect(w.writes).toEqual(['v1', 'v1'])
    w.finish()
    await tick()
    expect(statuses.at(-1)).toBe('saved')
    expect(saver.pending).toBe(false)
  })

  it('settled() resolves once everything is written', async () => {
    const w = slowWriter()
    const saver = createSaver(w.write)
    saver.save('v1')
    let done = false
    saver.settled().then(() => (done = true))
    await tick()
    expect(done).toBe(false)
    w.finish()
    await tick()
    await tick()
    expect(done).toBe(true)
  })

  it('settled() fails when the write fails', async () => {
    const w = slowWriter()
    const saver = createSaver(w.write)
    saver.save('v1')
    let failure = null
    saver.settled().catch((e) => (failure = e.message))
    await tick()
    w.fail()
    await tick()
    await tick()
    expect(failure).toBe('disco lleno')
  })

  it('settled() resolves right away when nothing is waiting', async () => {
    let done = false
    createSaver(() => Promise.resolve()).settled().then(() => (done = true))
    await tick()
    expect(done).toBe(true)
  })
})
