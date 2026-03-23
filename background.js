// Secretário Escolar — background.js
// Executa comandos enviados pelo site via bridge.js
// Sem WebSocket permanente — responde a chamadas sob demanda

let agentTabId = null

// ── Comandos ─────────────────────────────────────────────

async function handleCommand(cmd) {
  const type = cmd.action || cmd.type  // suporta ambos os formatos
  switch (type) {
    case 'ping':       return { ok: true, version: '1.0.0' }
    case 'navigate':   return await cmdNavigate(cmd.url)
    case 'read_page':  return await cmdReadPage()
    case 'click':      return await cmdClick(cmd.selector)
    case 'fill':       return await cmdFill(cmd.selector, cmd.value)
    case 'fill_form':  return await cmdFillForm(cmd.fields)
    case 'evaluate':   return await cmdEvaluate(cmd.code)
    case 'screenshot': return await cmdScreenshot()
    case 'close_tab':  return await cmdCloseTab()
    case 'wait':       return await cmdWait(cmd.ms || 1000)
    default:           return { ok: false, error: 'Comando desconhecido: ' + type }
  }
}

async function cmdNavigate(url) {
  if (agentTabId) {
    try { await chrome.tabs.update(agentTabId, { url }) }
    catch { const t = await chrome.tabs.create({ url, active: false }); agentTabId = t.id }
  } else {
    const t = await chrome.tabs.create({ url, active: false })
    agentTabId = t.id
  }
  await waitTabLoad(agentTabId)
  return { ok: true, url }
}

async function cmdReadPage() {
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: () => ({ title: document.title, url: location.href, text: document.body.innerText.slice(0, 3000) }),
  })
  return r.result
}

async function cmdClick(selector) {
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: (sel) => {
      const el = document.querySelector(sel)
      if (!el) return { ok: false, error: 'Não encontrado: ' + sel }
      el.scrollIntoView({ block: 'center' }); el.click(); return { ok: true }
    },
    args: [selector],
  })
  return r.result
}

async function cmdFill(selector, value) {
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: (sel, val) => {
      const el = document.querySelector(sel)
      if (!el) return { ok: false, error: 'Não encontrado: ' + sel }
      el.focus(); el.value = val
      el.dispatchEvent(new Event('input',  { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return { ok: true }
    },
    args: [selector, value],
  })
  return r.result
}

async function cmdFillForm(fields) {
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    func: (fields) => {
      for (const f of fields) {
        const el = document.querySelector(f.selector)
        if (!el) continue
        el.scrollIntoView({ block: 'center' })
        if (f.type === 'click') { el.click() }
        else { el.focus(); el.value = f.value; el.dispatchEvent(new Event('input', { bubbles: true })) }
      }
      return { ok: true }
    },
    args: [fields],
  })
  return r.result
}

async function cmdEvaluate(code) {
  // Use executeScript with world: 'MAIN' to run arbitrary code
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: agentTabId },
    world: 'MAIN',
    func: (c) => { try { return eval(c) } catch(e) { return 'error: ' + e.message } },
    args: [code]
  })
  return { value: r.result }
}

async function cmdScreenshot() {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 })
  return { screenshot: dataUrl }
}

async function cmdCloseTab() {
  if (agentTabId) { try { await chrome.tabs.remove(agentTabId) } catch {} agentTabId = null }
  return { ok: true }
}

async function cmdWait(ms) {
  await new Promise(r => setTimeout(r, Math.min(ms, 10000)))
  return { ok: true }
}

function waitTabLoad(tabId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 12000)
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        clearTimeout(timeout)
        setTimeout(resolve, 600)
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

// ── Mensagens da bridge.js ────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'ping') {
    reply({ ok: true, connected: true })
    return true
  }

  if (msg.type === 'execute') {
    handleCommand(msg.cmd)
      .then(result => reply({ ok: true, result }))
      .catch(err  => reply({ ok: false, error: err.message }))
    return true // async reply
  }

  if (msg.type === 'get_status') {
    reply({ connected: true })
    return true
  }
})
