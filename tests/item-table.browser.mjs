// Run with node --test tests/item-table.browser.mjs (CHROME_PATH can override Chrome).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createServer } from '../akura-marketing/node_modules/vite/dist/node/index.js'

const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from 'antd';
import ItemPage from '/src/modules/item/ItemPage.jsx';
const item = { id: 'item-1', name: 'Detail name', uom: 'JOINT', version: 1, isActive: true };
window.writes = [];
window.fetch = async (url, options = {}) => {
  const path = new URL(url, location.href).pathname;
  let data;
  if (options.method === 'PATCH') { window.writes.push(JSON.parse(options.body)); Object.assign(item, JSON.parse(options.body)); }
  if (path.endsWith('/items/item-1')) data = item;
  else if (path.endsWith('/items')) data = { items: [{ ...item, name: 'List name' }], pagination: { total: 1 } };
  else if (path.endsWith('/sizes')) data = { sizes: [{ id: 'size-1', size: 'Large', isActive: true, version: 1, priceStatus: 'AVAILABLE', priceServicePrimary: '100', priceServiceSisterCompany: '90' }], pagination: { total: 1 } };
  else if (path.endsWith('/services')) data = { services: [], pagination: { totalPages: 1 } };
  else data = { history: [], pagination: { total: 0 } };
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } });
};
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(App, null, React.createElement(ItemPage))));
`

test('Item edit uses detail values, skips unchanged saves, and action columns respond to viewport', { timeout: 120000 }, async () => {
  const root = fileURLToPath(new URL('../akura-marketing', import.meta.url))
  const server = await createServer({ configFile: false, root, cacheDir: 'node_modules/.vite-item-table-test',
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'item-table-fixture',
      resolveId(id) { if (id === '/fixture.js') return '\0fixture' },
      load(id) { if (id === '\0fixture') return fixture },
      configureServer(instance) { instance.middlewares.use('/test', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end(await instance.transformIndexHtml('/test', '<div id="root"></div><script type="module" src="/fixture.js"></script>'))
      }) },
    }],
  })
  const profile = await mkdtemp(join(tmpdir(), 'akura-item-table-'))
  let chrome, socket
  try {
    await server.listen()
    console.log('Fixture server ready')
    chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true })
    const pause = () => new Promise(resolve => setTimeout(resolve, 100))
    const until = async (fn) => {
      const deadline = Date.now() + 30000
      while (Date.now() < deadline) { const value = await fn(); if (value) return value; await pause() }
      throw new Error('Browser condition timed out')
    }
    const port = await until(async () => { try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { return null } })
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json())
    console.log('Chrome ready')
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    let id = 0
    const pending = new Map()
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data)
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id) }
    }
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const key = ++id
      pending.set(key, result => result.error ? reject(new Error(JSON.stringify(result.error))) : resolve(result.result))
      socket.send(JSON.stringify({ id: key, method, params }))
    })
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    const click = async (label) => {
      await until(() => evaluate(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)} && b.getClientRects().length && !b.disabled)`))
      await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)} && b.getClientRects().length && !b.disabled).click()`)
    }
    const viewport = width => send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
    await viewport(1280)
    await send('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/test` })
    await until(() => evaluate(`!!document.querySelector('[aria-label="View List name"]')`))
    console.log('Item page loaded')
    const cell = `document.querySelector('td.akura-actions-cell')`
    await until(() => evaluate(`${cell} && getComputedStyle(${cell}).position === 'sticky'`))
    assert.equal(await evaluate(`getComputedStyle(${cell}).textAlign`), 'center')
    const dimensions = await evaluate(`({ cell: ${cell}.getBoundingClientRect().width, content: ${cell}.querySelector('.akura-actions-content').getBoundingClientRect().width })`)
    assert.ok(dimensions.cell >= dimensions.content && dimensions.cell - dimensions.content < 50, JSON.stringify(dimensions))
    await viewport(375)
    await until(() => evaluate(`getComputedStyle(${cell}).position !== 'sticky'`))
    await viewport(1280)
    await until(() => evaluate(`getComputedStyle(${cell}).position === 'sticky'`))
    console.log('Responsive actions verified')
    await click('Add Item')
    await click('Cancel')
    // Simulate measuring content during a modal's scale animation. Removing the
    // transform does not trigger ResizeObserver because its layout size is unchanged.
    await evaluate(`window.motionStyle = document.createElement('style'); motionStyle.textContent = '.ant-modal { transform: scale(.5) !important; animation: none !important; }'; document.head.append(motionStyle)`)
    await evaluate(`document.querySelector('[aria-label="View List name"]').click()`)
    await until(() => evaluate(`!!document.querySelector('.item-size-table td.akura-actions-cell button')`))
    await evaluate(`new Promise(resolve => setTimeout(resolve, 500))`)
    await evaluate(`motionStyle.remove()`)
    await evaluate(`new Promise(resolve => setTimeout(resolve, 300))`)
    const sizeDimensions = await evaluate(`(() => {
      const cell = document.querySelector('.item-size-table td.akura-actions-cell');
      const content = cell.querySelector('.akura-actions-content');
      return { cell: cell.offsetWidth, content: content.offsetWidth };
    })()`)
    assert.ok(sizeDimensions.cell >= sizeDimensions.content + 30, JSON.stringify(sizeDimensions))
    await viewport(535)
    await until(() => evaluate(`getComputedStyle(document.querySelector('.item-size-table td.akura-actions-cell')).position !== 'sticky'`))
    const bounds = await evaluate(`(() => {
      const table = document.querySelector('.item-size-table');
      table.querySelector('.ant-table-content').scrollLeft = 10000;
      const header = table.querySelector('th.akura-actions-cell').getBoundingClientRect();
      const cell = table.querySelector('td.akura-actions-cell').getBoundingClientRect();
      return { header: header.width, cell: cell.width, buttons: [...table.querySelectorAll('td.akura-actions-cell button')].every(button => { const box = button.getBoundingClientRect(); return box.left >= cell.left && box.right <= cell.right; }) };
    })()`)
    assert.equal(bounds.header, bounds.cell)
    assert.equal(bounds.buttons, true)
    await viewport(1280)
    await click('Update Item')
    await until(() => evaluate(`!!document.querySelector('input[placeholder="Item name"]')`))
    await until(() => evaluate(`document.querySelector('input[placeholder="Item name"]')?.value === 'Detail name'`))
    assert.equal(await evaluate(`document.querySelector('input[placeholder="e.g. JOINT"]').value`), 'JOINT')
    await click('Save')
    await until(() => evaluate(`document.body.textContent.includes('No changes were made.')`))
    assert.deepEqual(await evaluate('window.writes'), [])
    assert.equal(await evaluate(`!!document.querySelector('.akura-save-confirmation')`), false)
    await evaluate(`const input = document.querySelector('input[placeholder="Item name"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'detail name'); input.dispatchEvent(new Event('input', { bubbles: true }));`)
    await click('Save')
    await until(() => evaluate(`!!document.querySelector('.akura-save-confirmation')`))
    await evaluate(`[...document.querySelectorAll('.akura-save-confirmation button')].find(b => b.textContent.trim() === 'Save').click()`)
    await until(() => evaluate('window.writes.length === 1'))
    assert.deepEqual(await evaluate('window.writes[0]'), { version: 1, name: 'detail name', uom: 'JOINT' })
    console.log('Edit values and saves verified')
  } finally {
    console.log('Closing browser fixture')
    socket?.close()
    if (chrome && chrome.exitCode === null) {
      chrome.kill()
      await new Promise(resolve => { chrome.once('exit', resolve); setTimeout(resolve, 2000).unref() })
    }
    await server.close()
    // The generated profile is confined to the temporary directory created above.
    assert.equal(dirname(resolve(profile)), resolve(tmpdir()))
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {})
  }
})
