// Locks the app after a number of minutes without keyboard, mouse or touch activity.
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
let last = Date.now()
let timer = null
const bump = () => {
  last = Date.now()
}

export function startIdleLock(minutes, onIdle) {
  stopIdleLock()
  last = Date.now()
  for (const event of ACTIVITY) window.addEventListener(event, bump, { passive: true })
  timer = setInterval(() => {
    if (Date.now() - last >= minutes * 60_000) onIdle()
  }, 5_000)
}

export function stopIdleLock() {
  for (const event of ACTIVITY) window.removeEventListener(event, bump)
  clearInterval(timer)
}
