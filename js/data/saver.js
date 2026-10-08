// Saves to the data file in the background. Writes never overlap, and when the
// person keeps typing only the newest version is written. A failed write is kept
// and written again on retry() or with the next change.
export function createSaver(write, onStatus = () => {}) {
  let latest = null // newest data not written yet
  let running = false
  let waiters = [] // settled() calls waiting for the queue to empty

  function finish(status, error) {
    onStatus(status, error)
    const done = waiters
    waiters = []
    for (const w of done) status === 'saved' ? w.resolve() : w.reject(error)
  }

  async function run() {
    running = true
    while (latest !== null) {
      const data = latest
      latest = null
      onStatus('saving')
      try {
        await write(data)
      } catch (error) {
        latest ??= data
        running = false
        finish('error', error)
        return
      }
    }
    running = false
    finish('saved')
  }

  return {
    save(data) {
      latest = data
      if (!running) run()
    },
    retry() {
      if (!running && latest !== null) run()
    },
    /** Resolves when everything is written; rejects if a write fails. */
    settled() {
      if (!running && latest === null) return Promise.resolve()
      if (!running) run()
      return new Promise((resolve, reject) => waiters.push({ resolve, reject }))
    },
    /** True while something is being written or a failed write is waiting. */
    get pending() {
      return running || latest !== null
    },
  }
}
