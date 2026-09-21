// Run with node --test tests/company-contract-cards.browser.mjs (CHROME_PATH can override Chrome).
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
import CompanyView from '/src/modules/company/CompanyView.jsx';
import '/src/modules/company/CompanyPage.css';
const statuses = ['DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'REVISED', 'TERMINATED'];
const contracts = Array.from({ length: 12 }, (_, i) => ({ id: 'contract-' + (i + 1), companyId: 'company-1', contractNumber: 'CONTRACT-' + (i + 1), status: statuses[i % 6], version: 0, contractDate: '2026-01-01', effectiveFrom: '2026-01-01', effectiveUntil: '2099-01-01', hasList: false, companySnapshot: { name: 'Test Company' } }));
window.requests = [];
window.fetch = async (url, options = {}) => {
  if (options.method && options.method !== 'GET') throw new Error('Unexpected mutation');
  const parsed = new URL(url, location.href); window.requests.push(String(url));
  let data;
  if (parsed.pathname.endsWith('/company-contracts')) {
    const page = Number(parsed.searchParams.get('page') || 1), limit = Number(parsed.searchParams.get('limit') || 10), status = parsed.searchParams.get('status');
    const rows = contracts.filter(row => !status || row.status === status);
    data = { contracts: rows.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
  } else if (parsed.pathname.includes('/company-contracts/')) data = contracts.find(row => parsed.pathname.endsWith('/' + row.id));
  else if (parsed.pathname.endsWith('/company-contract-prices')) data = { prices: [], pagination: { total: 0, totalPages: 1 } };
  else data = { staffs: [], pagination: { total: 0, totalPages: 1 } };
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } });
};
createRoot(document.getElementById('root')).render(React.createElement(App, null, React.createElement(CompanyView, { company: { id: 'company-1', name: 'Test Company' }, currentUser: { role: 'ADMIN', section: 'MARKETING' }, onClose: () => {}, onChanged: () => {} })));
`

test('Company contracts load on show, render all statuses as cards, and paginate within the viewed company', { timeout: 90000 }, async () => {
  const root = fileURLToPath(new URL('../akura-marketing', import.meta.url))
  const server = await createServer({ configFile: false, root, cacheDir: 'node_modules/.vite-contract-cards-test',
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
  const profile = await mkdtemp(join(tmpdir(), 'akura-contract-cards-'))
  let chrome, socket
  try {
    await server.listen()
    console.log('Fixture server ready')
    chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true })
    const pause = () => new Promise(resolve => setTimeout(resolve, 100))
    const until = async (fn) => {
      const deadline = Date.now() + 25000
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
      if (message.method === 'Log.entryAdded') console.error(JSON.stringify(message.params.entry))
      if (message.method === 'Runtime.exceptionThrown') console.error(JSON.stringify(message.params.exceptionDetails))
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id) }
    }
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const key = ++id
      const timer = setTimeout(() => { pending.delete(key); reject(new Error('CDP timeout: ' + method)) }, 10000)
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
    await until(() => evaluate(`!!document.querySelector('[aria-controls="company-contract-cards"]')`))
    assert.equal(await evaluate(`window.requests.some(url => url.includes('/company-contracts'))`), false)
    assert.equal(await evaluate(`document.querySelector('#company-contract-cards').hidden`), true)
    const headings = await evaluate(`[...document.querySelectorAll('h3')].map(el => el.textContent)`)
    assert.ok(headings.indexOf('Contracts') > headings.indexOf('Company Staff'))
    await click('Show Contracts')
    await until(() => evaluate(`document.querySelectorAll('.company-contract-card').length === 10`))
    assert.equal(await evaluate(`document.querySelectorAll('#company-contract-cards table').length`), 0)
    assert.deepEqual(await evaluate(`[...new Set([...document.querySelectorAll('.company-contract-title .ant-tag')].map(el => el.textContent))]`), ['DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'REVISED', 'TERMINATED'])
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(el => el.textContent === 'Add Contract').disabled`), true)
    await evaluate(`document.querySelector('.company-contract-pagination .ant-pagination-item-2').click()`)
    await until(() => evaluate(`document.querySelectorAll('.company-contract-card').length === 2`))
    assert.equal(await evaluate(`document.querySelector('.company-contract-list').textContent.includes('CONTRACT-12')`), true)
    await click('Hide Contracts')
    assert.equal(await evaluate(`document.querySelector('#company-contract-cards').hidden`), true)
    await click('Show Contracts')
    await until(() => evaluate(`document.querySelectorAll('.company-contract-card').length === 2`))
    await evaluate(`document.querySelector('.company-contract-card button[aria-label="View Contract Prices"]').click()`)
    await until(() => evaluate(`window.requests.some(url => url.includes('/company-contracts/contract-11'))`))
    assert.equal(await evaluate(`window.requests.filter(url => url.includes('/company-contract-prices')).every(url => new URL(url, location.href).searchParams.get('contractId') === 'contract-11')`), true)
    assert.equal(await evaluate(`window.requests.some(url => new URL(url, location.href).searchParams.get('limit') === '100')`), false)
    assert.equal(await evaluate(`window.requests.some(url => new URL(url, location.href).pathname.endsWith('/company-contracts') && new URL(url, location.href).searchParams.has('status'))`), false)
    console.log('Show/hide, card statuses, pagination, creation guard, and viewed contract verified')
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
