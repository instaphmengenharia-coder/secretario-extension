const dot        = document.getElementById('dot')
const statusText = document.getElementById('statusText')
const openBtn    = document.getElementById('openBtn')

chrome.runtime.sendMessage({ type: 'ping' }, (resp) => {
  if (!chrome.runtime.lastError && resp?.ok) {
    dot.className = 'dot connected'
    statusText.textContent = 'Ativo e pronto'
  } else {
    dot.className = 'dot connecting'
    statusText.textContent = 'Reiniciando...'
  }
})

openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://nova-pasta-secretario.vercel.app' })
})
