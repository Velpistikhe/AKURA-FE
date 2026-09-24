// Run with node --test tests/company-contract-prices.browser.mjs (CHROME_PATH can override Chrome).
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
import { App } from '/src/components/global';
import CompanyContractPrices from '/src/modules/company/CompanyContractPrices.jsx';
const contract = { id: 'contract-1', contractNumber: 'CONTRACT-001', version: 4, status: 'APPROVED', hasList: true, effectiveFrom: '2020-01-01', effectiveUntil: '2099-01-01' };
const company = { id: 'company-1', name: 'Test Company', revoked: false };
let price = { id: 'price-1', contractId: contract.id, itemSizeId: 'size-existing', version: 7, isActive: true, priceService: '100.25', priceMaintenance: '20', contract, catalogSnapshot: { itemName: 'Existing Pipe', size: 'Large', serviceName: 'Inspection', hasMaintenance: true } };
window.writes = []; window.requests = []; window.conflict = false; window.contractPricesClosed = 0;
window.fetch = async (url, options = {}) => {
  const path = new URL(url, location.href).pathname; window.requests.push(String(url));
  let data;
  if (['POST', 'PATCH'].includes(options.method)) {
    const body = JSON.parse(options.body); window.writes.push({ path, method: options.method, body });
    if (window.conflict) { window.conflict = false; return new Response(JSON.stringify({ success: false, message: 'Stale version' }), { status: 409, headers: { 'content-type': 'application/json' } }); }
    if (options.method === 'PATCH') price = { ...price, ...body, version: price.version + 1 };
    data = price;
  } else if (path.endsWith('/company-contract-prices/price-1/history')) {
    const page = Number(new URL(url, location.href).searchParams.get('page'));
    data = { contractPriceId: price.id, history: [{ id: 'history-' + page, version: page === 1 ? 7 : 6, action: 'UPDATE', changedAt: '2026-09-23T01:00:00Z', changedBy: { name: 'History Reviewer' }, changes: [{ field: 'priceService', label: 'Service price', before: '80.25', after: '100.25' }] }], pagination: { page, limit: 20, total: 21, totalPages: 2 } };
  } else if (path.endsWith('/company-contract-prices')) data = { prices: [price], pagination: { total: 1, totalPages: 1 } };
  else if (path.endsWith('/company-contracts/contract-1')) data = contract;
  else if (path.endsWith('/items/sizes/contract-price-options/contract-1')) data = { sizes: [{ id: 'size-new', itemId: 'item-new', version: 0, size: null, itemName: 'New Pipe', serviceName: 'Inspection' }], pagination: { total: 1, totalPages: 1 } };
  else if (path.endsWith('/items/item-new')) data = { id: 'item-new', name: 'New Pipe', service: { name: 'Inspection', hasMaintenance: true } };
  else throw new Error('Unexpected request: ' + path);
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } });
};
const root = createRoot(document.getElementById('root'));
window.mount = (role = 'ADMIN', section = 'MARKETING', revoked = false) => root.render(React.createElement(React.StrictMode, null, React.createElement(App, null,
  React.createElement(CompanyContractPrices, { key: role + section + revoked, initialContract: contract, company: { ...company, revoked }, currentUser: { role, section }, onClose: () => { window.contractPricesClosed++; }, onChanged: () => {} }))));
window.mount();
`

test('Contract prices use header filters, enforce role access, validate maintenance, and save versioned prices', { timeout: 180000 }, async () => {
  const root = fileURLToPath(new URL('../akura-marketing', import.meta.url))
  const server = await createServer({ configFile: false, root, cacheDir: 'node_modules/.vite-contract-prices-test',
    optimizeDeps: { include: ['react', 'react-dom/client', 'antd', '@ant-design/icons'] },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'contract-prices-fixture',
      resolveId(id) { if (id === '/fixture.js') return '\0fixture' },
      load(id) { if (id === '\0fixture') return fixture },
      configureServer(instance) { instance.middlewares.use('/test', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end(await instance.transformIndexHtml('/test', '<div id="root"></div><script type="module" src="/fixture.js"></script>'))
      }) },
    }],
  })
  const profile = await mkdtemp(join(tmpdir(), 'akura-contract-prices-'))
  let chrome, socket
  try {
    await server.listen()
    console.log('Fixture server ready')
    chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true })
    const pause = () => new Promise(resolve => setTimeout(resolve, 100))
    const until = async (fn) => {
      const deadline = Date.now() + 90000
      while (Date.now() < deadline) { const value = await fn(); if (value) return value; await pause() }
      console.error(await evaluate('document.body.innerText.slice(0, 2000)')); console.error(await evaluate('JSON.stringify(window.requests)'));
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
      if (message.method === 'Log.entryAdded') console.error(JSON.stringify(message.params.entry))
      if (message.method === 'Runtime.exceptionThrown') console.error(JSON.stringify(message.params.exceptionDetails))
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id) }
    }
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const key = ++id
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Chrome DevTools timeout: ${method}`)) }, 15000)
      pending.set(key, result => { clearTimeout(timer); result.error ? reject(new Error(JSON.stringify(result.error))) : resolve(result.result) })
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
    await send('Runtime.enable')
    await send('Log.enable')
    await viewport(1280)
    await send('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/test` })
    await until(() => evaluate(`!!document.querySelector('[aria-label="Edit Contract Price"]')`))
    console.log('Price list loaded')
    // The viewed contract is the target without another contract selection.
    await click('Add Contract Price')
    await until(() => evaluate(`!!document.querySelector('.ant-table-selection-column input[type="radio"]')`))
    assert.equal(await evaluate(`[...document.querySelectorAll('.ant-modal p')].some(p => p.textContent.includes('Test Company') && p.textContent.includes('CONTRACT-001'))`), true)
    await until(() => evaluate(`!document.querySelector('.ant-zoom-enter, .ant-zoom-appear')`))
    await click('Cancel')
    await until(() => evaluate(`!!document.querySelector('.ant-zoom-leave')`))
    await until(() => evaluate(`!document.querySelector('.ant-table-selection-column input[type="radio"]')`))
    await evaluate(`document.querySelector('[aria-label="Edit Contract Price"]').click()`)
    await until(() => evaluate(`!!document.getElementById('priceService') && !document.querySelector('.ant-zoom-enter, .ant-zoom-appear')`))
    await click('Cancel')
    await until(() => evaluate(`!!document.querySelector('.ant-zoom-leave') && !!document.getElementById('priceService')`))
    await until(() => evaluate(`!document.getElementById('priceService')`))
    assert.equal(await evaluate(`document.querySelectorAll('.company-view-section-heading .ant-select').length`), 0)
    assert.equal(await evaluate(`document.querySelectorAll('thead .ant-table-filter-trigger').length`), 2)
    assert.equal(await evaluate(`window.requests.filter(url => url.includes('company-contract-prices')).every(url => new URL(url, location.href).searchParams.get('companyId') === 'company-1')`), true)
    assert.equal(await evaluate(`window.requests.filter(url => url.includes('company-contract-prices')).every(url => new URL(url, location.href).searchParams.get('contractId') === 'contract-1')`), true)
    assert.equal(await evaluate(`window.requests.some(url => new URL(url, location.href).pathname.endsWith('/company-contracts'))`), false)
    console.log('Contract detail requests and fixed contract scope verified')
    assert.equal(await evaluate(`window.requests.some(url => url.includes('/price-1/history'))`), false)
    await evaluate(`document.querySelector('[aria-label^="View contract price history"]').click()`)
    await until(() => evaluate(`document.body.textContent.includes('History Reviewer')`))
    await evaluate(`document.querySelector('.ant-table-row-expand-icon').click()`)
    await until(() => evaluate(`document.body.textContent.includes('80.25') && document.body.textContent.includes('100.25')`))
    await evaluate(`[...document.querySelectorAll('.ant-modal')].find(el => el.textContent.includes('Contract Price History:')).querySelector('.ant-pagination-next button').click()`)
    await until(() => evaluate(`window.requests.some(url => url.includes('/price-1/history') && new URL(url, location.href).searchParams.get('page') === '2')`))
    await click('Close')
    await until(() => evaluate(`!document.body.textContent.includes('Contract Price History:')`))
    assert.equal(await evaluate('window.contractPricesClosed'), 0)
    await click('Add Contract Price')
    await until(() => evaluate(`!!document.querySelector('.ant-table-selection-column input[type="radio"]')`))
    await evaluate(`document.querySelector('.ant-table-selection-column input[type="radio"]').click()`)
    const input = async (id, value) => evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`)
    await input('priceService', '0')
    await click('Create')
    await until(() => evaluate(`document.body.textContent.includes('Price is required.')`))
    assert.equal(await evaluate('window.writes.length'), 0)
    await input('priceMaintenance', '0')
    await click('Create')
    await until(() => evaluate(`!!document.querySelector('.akura-save-confirmation')`))
    await evaluate(`[...document.querySelectorAll('.akura-save-confirmation button')].find(b => b.textContent.trim() === 'Save').click()`)
    await until(() => evaluate('window.writes.length === 1'))
    assert.deepEqual(await evaluate('window.writes[0]'), { path: '/api/v1/marketing/items/sizes/size-new/contract-prices', method: 'POST', body: { contractId: 'contract-1', priceService: '0', priceMaintenance: '0' } })
    await until(() => evaluate(`!document.getElementById('priceService')`))
    await evaluate(`document.querySelector('[aria-label="Edit Contract Price"]').click()`)
    await until(() => evaluate(`document.getElementById('priceService')?.value === '100,25'`))
    await input('priceService', '123,45')
    await click('Save')
    await until(() => evaluate(`!!document.querySelector('.akura-save-confirmation')`))
    await evaluate(`[...document.querySelectorAll('.akura-save-confirmation button')].find(b => b.textContent.trim() === 'Save').click()`)
    await until(() => evaluate('window.writes.length === 2'))
    assert.deepEqual(await evaluate('window.writes[1].body'), { version: 7, priceService: '123.45', priceMaintenance: '20' })
    await until(() => evaluate(`!document.getElementById('priceService')`))
    await evaluate(`window.conflict = true; document.querySelector('[aria-label="Edit Contract Price"]').click()`)
    await until(() => evaluate(`document.getElementById('priceService')?.value === '123,45'`))
    await click('Save')
    await until(() => evaluate(`!!document.querySelector('.akura-save-confirmation')`))
    await evaluate(`[...document.querySelectorAll('.akura-save-confirmation button')].find(b => b.textContent.trim() === 'Save').click()`)
    await until(() => evaluate(`window.writes.length === 3 && !document.getElementById('priceService')`))
    assert.equal(await evaluate('window.writes[2].body.version'), 8)
    for (const [role, section, canCreate] of [['USER', 'MARKETING', true], ['APP_MANAGER', 'MARKETING', true], ['ADMIN', 'FINANCE', false]]) {
      await evaluate(`window.mount(${JSON.stringify(role)}, ${JSON.stringify(section)})`)
      await until(() => evaluate(`document.body.textContent.includes('Existing Pipe') && !document.querySelector('[aria-label="Edit Contract Price"]')`))
      assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Add Contract Price')`), canCreate)
      assert.equal(await evaluate(`!!document.querySelector('[aria-label^="View contract price history"]')`), true)
      if (canCreate) assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add Contract Price').disabled`), true, 'Approved prices require Marketing ADMIN')
    }
    await evaluate(`window.mount('ADMIN', 'MARKETING', true)`)
    await until(() => evaluate(`document.body.textContent.includes('Existing Pipe') && !document.querySelector('[aria-label="Edit Contract Price"]')`))
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Add Contract Price')`), false)
    await until(() => evaluate(`!document.querySelector('.ant-zoom-enter, .ant-zoom-appear')`))
    await evaluate(`document.querySelector('.ant-modal-close').click()`)
    await until(() => evaluate(`!!document.querySelector('.ant-zoom-leave')`))
    assert.equal(await evaluate('window.contractPricesClosed'), 0)
    await until(() => evaluate('window.contractPricesClosed === 1'))
    console.log('Header filters, create/edit, conflict refresh, and permissions verified')
  } catch (error) {
    console.error(error)
    throw error
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
