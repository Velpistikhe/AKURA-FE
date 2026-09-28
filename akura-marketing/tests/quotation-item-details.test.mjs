import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('Selected quotation item renders quantities and note using the real global components', { timeout: 60000 }, async () => {
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.vite-item-details-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [react()], server: { middlewareMode: true }, appType: 'custom',
  })
  try {
    const { default: ItemDetails } = await server.ssrLoadModule('/src/modules/quotation/QuotationItemDetails.jsx')
    const { App } = await server.ssrLoadModule('/src/components/global/AntdComponents.jsx')
    for (const priceMaintenance of [null, '50', '0']) {
      const markup = renderToStaticMarkup(createElement(App, null, createElement(ItemDetails, {
        item: { itemSizeId: 'size-1', itemName: 'Test Pipe', serviceName: 'Inspection', size: 'Large', priceMaintenance },
        saving: false, blocked: false, onBack() {}, onConfirm() {},
      })))
      assert.match(markup, /Test Pipe/)
      assert.match(markup, /New item inspection quantity/)
      assert.match(markup, /New item note/)
      assert.match(markup, /Add Item/)
      assert.equal(markup.includes('New item maintenance quantity'), priceMaintenance !== null)
    }
  } finally { await server.close() }
})
