// Injected only on nova-pasta-secretario.vercel.app
// Bridges the React app ↔ Extension background

(function () {
  // Announce extension presence to the page
  window.postMessage({ type: 'SE_EXT_PRESENT', extId: chrome.runtime.id }, '*')

  // Listen for messages from the React app
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const msg = event.data

    if (msg.type === 'SE_SET_USER') {
      chrome.runtime.sendMessage({ type: 'set_user', userId: msg.userId }, (resp) => {
        window.postMessage({ type: 'SE_STATUS', connected: resp?.connected ?? false }, '*')
      })
    }

    if (msg.type === 'SE_GET_STATUS') {
      chrome.runtime.sendMessage({ type: 'get_status' }, (resp) => {
        window.postMessage({ type: 'SE_STATUS', connected: resp?.connected ?? false, userId: resp?.userId }, '*')
      })
    }
  })
})()
