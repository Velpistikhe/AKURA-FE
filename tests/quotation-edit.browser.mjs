// Run with node --test tests/quotation-edit.browser.mjs (CHROME_PATH can override Chrome).
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
import QuotationPage from '/src/modules/quotation/QuotationPage.jsx';
import { TEXT_FIELDS } from '/src/modules/quotation/quotationModel.js';
const record = { id: 'quote-1', version: 2, isActive: true, status: 'CREATED', companySnapshot: { id: 'company-1', name: 'Test Company' }, staffId: 'staff-1', customerSnapshot: 'Test Contact', inquiryMethod: 'WHATSAPP', inquiryDate: '2026-09-22', ...Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, 'Saved ' + key])), items: [{ id: 'line-1', version: 3, itemSizeId: 'size-1', isActive: true, itemName: 'Existing Pipe', serviceName: 'Inspection', size: 'Large', note: 'Saved note', quantityInspection: '2.500', quantityMaintenance: '1.000', priceInspection: '100', priceMaintenance: '50' }, { id: 'inactive', isActive: false, itemName: 'Inactive Pipe' }] };
window.requests = []; window.writes = []; window.failOptions = false;
window.fetch = async (url, options = {}) => {
  const path = new URL(url, location.href).pathname; window.requests.push(path); if (path.endsWith('/sizes/prices')) window.optionQuery = new URL(url, location.href).search;
  let data;
  if (options.method === 'DELETE') {
    window.writes.push({ path, body: JSON.parse(options.body) }); record.version++;
    record.items = record.items.map(item => item.id === 'line-2' ? { ...item, isActive: false } : item); data = record;
  } else if (options.method === 'POST' && path.endsWith('/items')) {
    const body = JSON.parse(options.body); window.writes.push({ path, body }); record.version++;
    record.items.push({ ...record.items[0], ...body, id: 'line-2', version: 0, itemName: 'New Pipe', isActive: true }); data = record;
  } else if (path.endsWith('/sizes/prices')) data = { sizes: [
    { id: 'size-1', priceStatus: 'AVAILABLE', priceSource: 'PRIMARY', priceService: '100', priceMaintenance: '50', catalogSnapshot: { itemName: 'Existing Pipe', size: 'Large' } },
    { id: 'size-2', priceStatus: 'AVAILABLE', priceSource: 'PRIMARY', priceService: '100', priceMaintenance: null, catalogSnapshot: { itemName: 'New Pipe', size: 'Small' } }
  ], pagination: { total: 2, totalPages: 1 } };
  else if (['POST', 'PATCH'].includes(options.method)) { window.writes.push({ path, body: JSON.parse(options.body) }); data = { ...record, status: 'APPROVED' }; }
  else if (path.endsWith('/quotations/quote-1')) data = record;
  else if (path.endsWith('/quotations')) data = { quotations: [record], pagination: { total: 1, totalPages: 1 } };
  else if (path.endsWith('/companies') || path.endsWith('/company-staffs')) {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (window.failOptions) { return new Response(JSON.stringify({ message: 'Test load error' }), { status: 500 }); }
    data = path.endsWith('/companies') ? { companies: [record.companySnapshot] } : { staffs: [{ id: 'staff-1', companyId: 'company-1', name: 'Test Contact' }] };
  } else throw new Error('Unexpected request: ' + path);
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } });
};
const root = createRoot(document.getElementById('root'));
window.mount = (role = 'ADMIN', section = 'MARKETING') => root.render(React.createElement(React.StrictMode, null, React.createElement(App, null, React.createElement(QuotationPage, { key: role + section, currentUser: { role, section } }))));
window.mount();
`

test('Quotation edit defaults survive reopen and retry; unchanged save skips API; approval requires Marketing ADMIN', { timeout: 180000 }, async () => {
  const root = fileURLToPath(new URL('../akura-marketing', import.meta.url))
  const server = await createServer({ configFile: false, root, cacheDir: 'node_modules/.vite-quotation-edit-test',
    optimizeDeps: { include: ['react', 'react-dom/client', 'antd', '@ant-design/icons'] },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'quotation-edit-fixture',
      resolveId(id) { if (id === '/fixture.js') return '\0fixture' },
      load(id) { if (id === '\0fixture') return fixture },
      configureServer(instance) { instance.middlewares.use('/test', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end(await instance.transformIndexHtml('/test', '<div id="root"></div><script type="module" src="/fixture.js"></script>'))
      }) },
    }],
  })
  const profile = await mkdtemp(join(tmpdir(), 'akura-quotation-edit-'))
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

    const view = async () => {
      await until(() => evaluate(`!!document.querySelector('[aria-label^="View quotation "]')`));
      await evaluate(`document.querySelector('[aria-label^="View quotation "]').click()`);
      await until(() => evaluate('!!document.querySelector(".quotation-detail")'));
    };
    const hasApprove = () => evaluate("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Approve Quotation')");
    await view();
    assert.equal(await hasApprove(), true);
    for (let cycle = 0; cycle < 3; cycle++) {
      if (cycle === 2) await evaluate('window.failOptions = true');
      await click('Update Quotation');
      if (cycle === 2) {
        await until(() => evaluate("document.body.textContent.includes('Unable to load companies and contacts.')"));
        await evaluate('window.failOptions = false');
        await click('Retry');
      }
      await until(() => evaluate("!!document.getElementById('items_0_quantityInspection')"));
      const values = await evaluate("({ subject: document.getElementById('subject').value, date: document.getElementById('inquiryDate').value, inspection: document.querySelector('[aria-label=\"Inspection Quantity item 1\"]').value, maintenance: document.querySelector('[aria-label=\"Maintenance Quantity item 1\"]').value, note: document.querySelector('[aria-label=\"Note item 1\"]').value, company: document.getElementById('companyId').closest('.ant-select').textContent, staff: document.getElementById('staffId').closest('.ant-select').textContent, rows: document.querySelectorAll('.quotation-items-table tbody tr.ant-table-row').length, table: document.querySelector('.quotation-items-table').textContent })");
      assert.equal(values.subject, 'Saved subject');
      assert.equal(values.date, '2026-09-22');
      assert.equal(values.inspection, '2.5');
      assert.equal(values.maintenance, '1');
      assert.equal(values.note, 'Saved note');
      assert.match(values.company, /Test Company/);
      assert.match(values.staff, /Test Contact/);
      assert.equal(values.rows, 1);
      assert.match(values.table, /Existing Pipe/);
      assert.match(values.table, /250.00/);
      assert.equal(await evaluate("document.getElementById('companyId').disabled"), true);
      for (const label of ['Inspection Quantity item 1', 'Maintenance Quantity item 1', 'Note item 1']) {
        assert.equal(await evaluate('document.querySelector(' + JSON.stringify('[aria-label="' + label + '"]') + ').disabled'), true);
      }
      assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Add Item')"), true);
      assert.equal(await evaluate("!!document.querySelector('[aria-label^=Remove]')"), true);
      await click('Save');
      await until(() => evaluate("document.body.textContent.includes('No changes were made.')"));
      assert.equal(await evaluate('window.writes.length'), 0);
      assert.equal(await evaluate("!!document.querySelector('.akura-save-confirmation')"), false);
      await evaluate("(() => { const el = document.getElementById('subject'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Unsaved change'); el.dispatchEvent(new Event('input', { bubbles: true })); })()");
      console.log('Verified defaults and unchanged save, cycle ' + cycle);
      await click('Cancel');
      await until(() => evaluate("!document.getElementById('subject')"));
      await view();
    }
    await click('Update Quotation');
    await until(() => evaluate("!!document.getElementById('subject')"));
    await evaluate("(() => { const el = document.getElementById('subject'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Preserved header'); el.dispatchEvent(new Event('input', { bubbles: true })); })()");
    await click('Add Item');
    await click('Select Item');
    assert.match(await evaluate('window.optionQuery'), /exclude=size-1/);
    await until(() => evaluate("document.querySelectorAll('.quotation-items-table tbody tr.ant-table-row').length === 2"));
    assert.deepEqual(await evaluate('window.writes[0]'), { path: '/api/v1/marketing/quotations/quote-1/items', body: { version: 2, itemSizeId: 'size-2', quantityInspection: '1', quantityMaintenance: '0', note: null } });
    assert.equal(await evaluate("document.getElementById('subject').value"), 'Preserved header');
    await until(() => evaluate("![...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Select Item')"));
    await evaluate("document.querySelector('[aria-label=\"Remove item 2\"]').click()");
    await click('Delete');
    await until(() => evaluate("document.querySelectorAll('.quotation-items-table tbody tr.ant-table-row').length === 1"));
    assert.deepEqual(await evaluate('window.writes[1]'), { path: '/api/v1/marketing/quotations/quote-1/items/line-2', body: { quotationVersion: 3, itemVersion: 0 } });
    assert.equal(await evaluate("document.getElementById('subject').value"), 'Preserved header');
    await click('Cancel');
    await until(() => evaluate("!document.getElementById('subject')"));
    await evaluate('window.writes = []');
    await view();
    await click('Approve Quotation');
    await click('Approve');
    await until(() => evaluate('window.writes.length === 1'));
    assert.deepEqual(await evaluate('window.writes[0]'), { path: '/api/v1/marketing/quotations/quote-1/approve', body: { version: 4 } });
    await until(() => evaluate("![...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Update Quotation')"));
    for (const [role, section] of [['USER', 'MARKETING'], ['APP_MANAGER', 'MARKETING'], ['ADMIN', 'FINANCE']]) {
      await evaluate('window.mount(' + JSON.stringify(role) + ',' + JSON.stringify(section) + ')');
      await until(() => evaluate("!document.querySelector('.quotation-detail')"));
      await view();
      assert.equal(await hasApprove(), false, role + '/' + section);
    }
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
