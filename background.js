const RAILWAY_WS = 'wss://agente-servidor-production.up.railway.app/extension'

let ws = null
let userId = null
let agentTabId = null
let pendingCommands = {} // id → { resolve, reject }

// ── WebSocket ──────────────────────────────────────────────

function connect() {
  try {
    ws = new WebSocket(RAILWAY_WS)

    ws.onopen = () => {
      console.log('[SE] Conectado ao Railway')
      setStatus('connected')
      if (userId) sendWS({ type: 'auth', userId })
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleCommand(msg)
      } catch {}
    }

    ws.onclose = () => {
      console.log('[SE] Desconectado, reconectando em 4s...')
      setStatus('disconnected')
      setTimeout(connect, 4000)
    }

    ws.onerror = () => {
      ws.close()
    }
  } catch (e) {
    setTimeout(connect, 4000)
  }
}

function sendWS(data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data))
  }
}

function setStatus(status) {
  chrome.storage.local.set({ status })
  chrome.action.setBadgeText({ text: status === 'connected' ? '✓' : '...' })
  chrome.action.setBadgeBackgroundColor({ color: status === 'connected' ? '#34a853' : '#9aa0a6' })
}

// ── Comandos vindos do Railway ────────────────────────────

async function handleCommand(msg) {
  const { id, type } = msg

  if (type === 'ping') {
    sendWS({ type: 'pong', id })
    return
  }

  try {
    let result
    switch (type) {
      case 'navigate':   result = await cmdNavigate(msg.url);               break
      case 'read_page':  result = await cmdReadPage();                       break
      case 'click':      result = await cmdClick(msg.selector);              break
      case 'fill':       result = await cmdFill(msg.selector, msg.value);    break
      case 'fill_form':  result = await cmdFillForm(msg.fields);             break
      case 'evaluate':   result = await cmdEvaluate(msg.code);               break
      case 'screenshot': result = await cmdScreenshot();                     break
      case 'close_tab':  result = await cmdCloseTab();                       break
      case 'wait':       result = await cmdWait(msg.ms || 1500);             break
      default:           result = { error: `Comando desconhecido: ${type}` }
    }
    sendWS({ type: 'result', id, result })
  } catch (err) {
    sendWS({ type: 'error', id, error: err.message })
  }
}

// ── Implementação dos comandos ────────────────────────────

async function cmdNavigate(url) {
  if (agentTabId) {
    try {
      await chrome.tabs.update(agentTabId, { url })
    } catch {
      // Tab foi fechada, cria nova
      const tab = await chrome.tabs.create({ url, active: false })
      agentTabId = tab.id
    }
  } else {
    const tab = await chrome.tabs.create({ url, active: false })
    agentTabId = tab.id
  }
  await waitTabLoad(agentTabId)
  return { ok: true, url }
}

async function cmdReadPage() {
  await injectContentIfNeeded()
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: () => ({
      title: document.title,
      url:   location.href,
      text:  document.body.innerText.slice(0, 8000),
    }),
  })
  return r.result
}

async function cmdClick(selector) {
  await injectContentIfNeeded()
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: (sel) => {
      const el = document.querySelector(sel)
      if (!el) return { ok: false, error: `Elemento não encontrado: ${sel}` }
      el.scrollIntoView({ block: 'center' })
      el.click()
      return { ok: true }
    },
    args: [selector],
  })
  return r.result
}

async function cmdFill(selector, value) {
  await injectContentIfNeeded()
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: (sel, val) => {
      const el = document.querySelector(sel)
      if (!el) return { ok: false, error: `Campo não encontrado: ${sel}` }
      el.focus()
      el.value = val
      el.dispatchEvent(new Event('input',  { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return { ok: true }
    },
    args: [selector, value],
  })
  return r.result
}

async function cmdFillForm(fields) {
  // fields = [{ selector, value, type }]  type: 'text' | 'click' | 'select'
  await injectContentIfNeeded()
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: (fields) => {
      const results = []
      for (const f of fields) {
        const el = document.querySelector(f.selector)
        if (!el) { results.push({ ok: false, selector: f.selector }); continue }
        el.scrollIntoView({ block: 'center' })
        if (f.type === 'click') {
          el.click()
        } else if (f.type === 'select') {
          el.value = f.value
          el.dispatchEvent(new Event('change', { bubbles: true }))
        } else {
          el.focus()
          el.value = f.value
          el.dispatchEvent(new Event('input',  { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        }
        results.push({ ok: true, selector: f.selector })
      }
      return { ok: true, results }
    },
    args: [fields],
  })
  return r.result
}

async function cmdEvaluate(code) {
  await injectContentIfNeeded()
  const fn = new Function(`return (${code})`)
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: fn,
  })
  return { value: r.result }
}

async function cmdScreenshot() {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 })
  return { screenshot: dataUrl }
}

async function cmdCloseTab() {
  if (agentTabId) {
    try { await chrome.tabs.remove(agentTabId) } catch {}
    agentTabId = null
  }
  return { ok: true }
}

async function cmdWait(ms) {
  await new Promise(r => setTimeout(r, ms))
  return { ok: true }
}

// ── Helpers ────────────────────────────────────────────────

async function injectContentIfNeeded() {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: agentTabId },
      func: () => true,
    })
  } catch {
    // ignore if already injected
  }
}

function waitTabLoad(tabId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 12000)
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        clearTimeout(timeout)
        setTimeout(resolve, 500) // extra 500ms para JS carregar
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

// ── Mensagens do site (bridge.js) ─────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'set_user') {
    userId = msg.userId
    chrome.storage.local.set({ userId })
    if (ws && ws.readyState === 1) sendWS({ type: 'auth', userId })
    reply({ ok: true, connected: ws?.readyState === 1 })
    return true
  }

  if (msg.type === 'get_status') {
    reply({ connected: ws?.readyState === 1, userId })
    return true
  }
})

// ── Init ───────────────────────────────────────────────────

chrome.storage.local.get(['userId', 'status'], (data) => {
  userId = data.userId || null
  connect()
})
