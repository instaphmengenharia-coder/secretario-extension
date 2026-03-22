// Injected into nova-pasta-secretario.vercel.app
// Bridges site ↔ extension background

;(function () {
  // Check if extension context is still valid
  function isValid() {
    try { return !!chrome.runtime?.id } catch { return false }
  }

  // Announce presence
  if (isValid()) {
    window.postMessage({ type: 'SE_EXT_PRESENT' }, '*')
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (!isValid()) return // Extension was reloaded, ignore

    const msg = event.data
    if (!msg || !msg.type) return

    if (msg.type === 'SE_GET_STATUS') {
      try {
        chrome.runtime.sendMessage({ type: 'ping' }, (resp) => {
          if (chrome.runtime.lastError) {
            window.postMessage({ type: 'SE_STATUS', connected: false }, '*')
            return
          }
          window.postMessage({ type: 'SE_STATUS', connected: !!(resp?.ok) }, '*')
        })
      } catch {
        window.postMessage({ type: 'SE_STATUS', connected: false }, '*')
      }
    }

    if (msg.type === 'SE_COMMAND') {
      try {
        chrome.runtime.sendMessage({ type: 'execute', cmd: msg.cmd }, (resp) => {
          if (chrome.runtime.lastError) return
          window.postMessage({ type: 'SE_RESULT', reqId: msg.reqId, result: resp }, '*')
        })
      } catch {}
    }
  })
})()
