import { clearFailures, formatWait, recordFailure, triesLeft, waitMessage, waitMs, wrongMessage } from '../attempts.js'
import { run } from './controls.js'

// Shared by login, unlock and recovery: counts wrong attempts, shows the warning,
// and during a wait disables the form with a live countdown on the button.
export function guardAttempts({ form, submit, label, lockInputs, alert, wrongWhat, canSubmit }) {
  let wrong = false
  let busy = false
  let waiting = waitMs() > 0

  function refresh() {
    if (busy) return
    const wait = waitMs()
    for (const input of lockInputs) input.disabled = wait > 0
    submit.textContent = wait > 0 ? `Espera ${formatWait(wait)}` : label
    submit.disabled = wait > 0 || !canSubmit()
    if (wait > 0) showOnce(waitMessage)
    else if (waiting) {
      // The wait just ended: clear the old message so it doesn't look like a new mistake.
      wrong = false
      alert.hide()
    } else if (wrong) showOnce(wrongMessage(wrongWhat, triesLeft()))
    waiting = wait > 0
  }

  // Re-setting identical text could make screen readers repeat it every tick.
  function showOnce(message) {
    if (alert.el.hidden || alert.el.textContent !== message) alert.show(message)
  }

  const ticker = setInterval(() => (form.isConnected ? refresh() : clearInterval(ticker)), 250)

  return {
    refresh,
    get wrong() {
      return wrong
    },
    /** check() resolves true when the secret is right; file problems end up in the alert. */
    async attempt(check, fileName) {
      busy = true
      wrong = false
      await run(
        submit,
        alert,
        async () => {
          if (await check()) return clearFailures()
          recordFailure()
          wrong = true
        },
        fileName,
      )
      busy = false
      refresh()
    },
  }
}
