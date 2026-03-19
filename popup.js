const dot        = document.getElementById('dot')
const statusText = document.getElementById('statusText')
const userText   = document.getElementById('userText')
const openBtn    = document.getElementById('openBtn')

chrome.runtime.sendMessage({ type: 'get_status' }, (resp) => {
  if (resp?.connected) {
    dot.className = 'dot connected'
    statusText.textContent = 'Conectado'
    userText.textContent = resp.userId ? `ID: ${resp.userId.slice(0, 12)}...` : ''
  } else {
    dot.className = 'dot connecting'
    statusText.textContent = 'Desconectado'
    userText.textContent = 'Aguardando login no site'
  }
})

openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://nova-pasta-secretario.vercel.app' })
})
