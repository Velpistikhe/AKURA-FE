// Run with node --test tests/modal-lifecycle.browser.mjs.
// PUPPETEER_MODULE may point to a module exporting puppeteer; CHROME_PATH selects Chrome.
// MODAL_SHELL_URL=http://localhost:4173/referensi/items exercises the running federation.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createServer } from '../akura-marketing/node_modules/vite/dist/node/index.js'

const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App, ConfigProvider, theme } from 'antd';
import ItemPage from '/src/modules/item/ItemPage.jsx';
createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(ConfigProvider, { theme: { algorithm: theme.darkAlgorithm } },
      React.createElement(App, null, React.createElement(ItemPage)))));
`

test('Item save confirmations release overlays even without animation events', { timeout: 120000 }, async () => {
  const module = await import(process.env.PUPPETEER_MODULE || 'puppeteer')
  const puppeteer = module.puppeteer || module.default
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../akura-marketing', import.meta.url)),
    cacheDir: 'node_modules/.vite-modal-test',
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'modal-lifecycle-fixture',
      resolveId(id) { if (id === '/fixture.js') return '\0fixture' },
      load(id) { if (id === '\0fixture') return fixture },
      configureServer(instance) {
        instance.middlewares.use('/modal-test', async (_req, res) => {
          res.setHeader('Content-Type', 'text/html')
          res.end(await instance.transformIndexHtml('/modal-test', '<div id="root"></div><script type="module" src="/fixture.js"></script>'))
        })
      },
    }],
  })
  let browser
  try {
    await server.listen()
    browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] })
    console.log('Browser started')
    for (const reduced of [false, true]) {
      const page = await browser.newPage()
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
      const item = { id: 'item-1', name: 'Tubing', version: 1, isActive: true, uom: 'JOINT', service: { id: 'service-1', name: 'Inspection', hasMaintenance: false } }
      const sizes = [{ id: 'price-size', size: 'Existing size', version: 1, isActive: true, priceStatus: 'UNAVAILABLE', item }]
      let writes = 0
      await page.setRequestInterception(true)
      page.on('request', request => {
        const path = new URL(request.url()).pathname
        if (!path.startsWith('/api/')) return request.continue()
        const headers = { 'access-control-allow-origin': request.headers().origin || 'http://localhost:4173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS' }
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers })
        let data
        if (path.endsWith('/auth/me')) data = { id: 'test-user', firstName: 'Test', lastName: 'Marketing', role: 'ADMIN', section: 'MARKETING' }
        else if (path.endsWith('/menus/my-menus')) data = [{ key: 'referensi', label: 'Referensi', hasItem: true, items: [{ key: 'items', label: 'Item' }] }]
        else if (path.endsWith('/sizes/price-size/price')) data = { id: 'price-1', version: 1, isActive: true, ...JSON.parse(request.postData() || '{}') }
        else if (path.endsWith('/sizes/price-size')) data = sizes[0]
        else if (path.endsWith('/sizes') && request.method() === 'POST') {
          writes++
          const payload = JSON.parse(request.postData())
          data = { id: `size-${writes}`, size: payload.size, version: 1, isActive: true, priceStatus: 'UNAVAILABLE', item }
          sizes.push(data)
        } else if (path.endsWith('/sizes')) data = { sizes, pagination: { total: sizes.length, totalPages: 1 } }
        else if (path.endsWith('/items/item-1')) data = item
        else if (path.endsWith('/items')) data = { items: [item], pagination: { total: 1 } }
        else if (path.endsWith('/services')) data = { services: [item.service], pagination: { totalPages: 1 } }
        else data = { history: [], pagination: { total: 0 } }
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
      })
      await page.goto(process.env.MODAL_SHELL_URL || `http://127.0.0.1:${server.httpServer.address().port}/modal-test`, { timeout: 60000 })
      await page.waitForSelector('[aria-label="View Tubing"]', { timeout: 60000 })
      if (!process.env.MODAL_SHELL_URL) {
        await page.addStyleTag({ content: await readFile(new URL('../akura-shell/src/theme.css', import.meta.url), 'utf8') })
        // Reproduce missing motion events; the shell run uses its actual styles and events.
        await page.addStyleTag({ content: '.akura-save-confirmation { animation: none !important; transition: none !important; }' })
        await page.evaluate(() => {
          for (const type of ['animationend', 'transitionend']) document.addEventListener(type, event => {
            if (event.target.classList.contains('akura-save-confirmation')) event.stopImmediatePropagation()
          }, true)
        })
      }
      const clickText = async (selector, label) => {
        const handle = await page.waitForFunction((selector, label) => [...document.querySelectorAll(selector)].find(el => el.textContent.trim() === label && !el.disabled && el.getClientRects().length), {}, selector, label)
        await handle.asElement().click()
        await handle.dispose()
      }
      const visibleModals = count => page.waitForFunction(count => [...document.querySelectorAll('.ant-modal-wrap')].filter(el => getComputedStyle(el).display !== 'none').length === count, {}, count)
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.click('[aria-label="View Tubing"]')
        await page.waitForSelector('[aria-label="New size"]')
        await page.waitForSelector('[aria-label="Set price for Existing size"]')
        await page.waitForFunction(() => !document.querySelector('.ant-modal.ant-zoom-appear, .ant-modal.ant-zoom-enter'))
        await page.click('[aria-label="Set price for Existing size"]')
        await visibleModals(2)
        await page.waitForSelector('input[placeholder="Enter price"]')
        for (const input of await page.$$('input[placeholder="Enter price"]')) await input.type('30000')
        await clickText('.ant-modal-footer button', 'Save')
        await visibleModals(3)
        await clickText('.akura-save-confirmation button', 'Save')
        await visibleModals(1)
        assert.equal(await page.$('.akura-save-confirmation'), null)
        await page.type('[aria-label="New size"]', `Size ${cycle}`)
        await clickText('button', 'Add Size')
        await visibleModals(2)
        await clickText('.akura-save-confirmation button', 'Cancel')
        await visibleModals(1)
        assert.equal(await page.$('.akura-save-confirmation'), null)
        assert.equal(writes, cycle)
        await clickText('button', 'Add Size')
        await visibleModals(2)
        await clickText('.akura-save-confirmation button', 'Save')
        await visibleModals(1)
        assert.equal(await page.$('.akura-save-confirmation'), null)
        await page.waitForFunction(() => document.querySelector('[aria-label="New size"]').value === '')
        assert.equal(writes, cycle + 1)
        await clickText('button', 'Show History')
        await clickText('button', 'Hide History')
        await clickText('.ant-modal-footer button', 'Close')
        await visibleModals(0)
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden')
        await clickText('button', 'Add Item')
        await visibleModals(1)
        await clickText('.ant-modal-footer button', 'Cancel')
        await visibleModals(0)
      }
      assert.deepEqual(errors, [])
      console.log(`PASS Item page: cancel/save confirmation, parent interaction, close/reopen; reduced motion=${reduced}`)
      await page.close()
    }
  } finally {
    await browser?.close()
    await server.close()
  }
})
