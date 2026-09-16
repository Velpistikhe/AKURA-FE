import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { financeModules, resolveFinanceRoute } from '../src/routes/financeRoutes.js'

test('Finance routes expose modules without quotation create/edit', () => {
  assert.equal(resolveFinanceRoute('/finance'), 'overview')
  for (const module of financeModules) assert.equal(resolveFinanceRoute(`${module.path}/`), module.key)
  assert.equal(resolveFinanceRoute('/finance/quotations'), 'finance_quotations')
  assert.equal(resolveFinanceRoute('/finance/proforma-invoice'), 'proforma_invoices')
  assert.equal(resolveFinanceRoute('/finance/invoice'), 'invoices')
  assert.equal(resolveFinanceRoute('/finance/tax'), 'taxes')
  assert.equal(resolveFinanceRoute('/finance/taxes'), 'taxes')
  assert.equal(resolveFinanceRoute('/referensi/taxes'), 'taxes')
  assert.equal(resolveFinanceRoute('/referensi/taxes/'), 'taxes')
  assert.equal(resolveFinanceRoute('/referensi/missing'), 'not-found')
  assert.equal(resolveFinanceRoute('/referensi/taxes/edit'), 'not-found')
  for (const path of ['/finance/quotations/create', '/finance/finance_quotations/edit', '/marketing/quotations', '/finance/missing']) assert.equal(resolveFinanceRoute(path), 'not-found')
})

test('Quotation service exposes only GET operations and forwards cancellation', async () => {
  const source = (await readFile(new URL('../src/services/quotationService.js', import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options) => ({ path, ...options })')
  const { quotationService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  assert.deepEqual(Object.keys(quotationService).sort(), ['get', 'list'])
  const controller = new AbortController()
  const request = quotationService.list({ page: 2, limit: 50 }, { signal: controller.signal, method: 'POST', body: '{}' })
  assert.equal(request.path, '/marketing/quotations?page=2&limit=50')
  assert.equal(request.method, 'GET')
  assert.equal(request.body, undefined)
  assert.equal(request.signal, controller.signal)
  const detail = quotationService.get('record/id', { method: 'DELETE' })
  assert.equal(detail.method, 'GET')
  assert.equal(detail.path, '/marketing/quotations/record%2Fid')
})
