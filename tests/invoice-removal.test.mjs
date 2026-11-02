import test from 'node:test'
import assert from 'node:assert/strict'
import { financeModules, resolveFinanceRoute } from '../akura-finance/src/routes/financeRoutes.js'
import { readFile } from 'node:fs/promises'

const loadService = async (path, name) => {
  const source = (await readFile(new URL(path, import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`))[name]
}

test('Finance navigation supports quotations and taxes after removing billing modules', () => {
  assert.deepEqual(financeModules.map(module => module.key).sort(), ['finance_quotations', 'taxes'])
  for (const module of financeModules) assert.equal(resolveFinanceRoute(module.path), module.key)
  assert.equal(resolveFinanceRoute('/finance'), 'overview')
  assert.equal(resolveFinanceRoute('/finance/quotations'), 'finance_quotations')
  assert.equal(resolveFinanceRoute('/finance/taxes'), 'taxes')
})

test('all former invoice and proforma URLs resolve to the unavailable page', () => {
  const aliases = ['invoices', 'invoice', 'proforma_invoices', 'proforma-invoices', 'proforma-invoice',
    'performa-invoice', 'performa_invoice', 'proforma_invoice']
  for (const alias of aliases) {
    for (const suffix of ['', '/', '/create', '/123']) {
      assert.equal(resolveFinanceRoute(`/finance/${alias}${suffix}`), 'not-found')
    }
  }
})

test('Marketing retains quotation and work order requests without invoice creation', async () => {
  const service = await loadService('../akura-marketing/src/services/quotationService.js', 'quotationService')
  assert.equal(service.createInvoice, undefined)
  const list = new URL(service.list({ page: 2, limit: 20, invoiceStatus: 'CREATED' }).path, 'http://localhost')
  assert.equal(list.pathname, '/marketing/quotations')
  assert.equal(list.searchParams.get('invoiceStatus'), 'CREATED')
  assert.equal(service.get('quotation-id').path, '/marketing/quotations/quotation-id')
  const payload = { quotationId: 'quotation-id', startDate: '2026-11-02', endDate: '2026-11-03', inspectors: [], items: [] }
  const request = service.createWorkOrder('quotation-id', payload)
  assert.equal(request.path, '/marketing/quotations/quotation-id/work-orders')
  assert.equal(request.method, 'POST')
  assert.deepEqual(JSON.parse(request.body), payload)
})

test('Field Service retains versioned work order actions without invoice creation', async () => {
  const service = await loadService('../akura-fieldservice/src/services/workOrderService.js', 'workOrderService')
  assert.equal(service.createInvoice, undefined)
  const requests = [
    [service.get('work-order-id'), '/fieldservice/work-orders/work-order-id', undefined, undefined],
    [service.update('work-order-id', { version: 3, status: 'COMPLETED' }), '/fieldservice/work-orders/work-order-id', 'PATCH', { version: 3, status: 'COMPLETED' }],
    [service.start('work-order-id', 3), '/fieldservice/work-orders/work-order-id/start', 'POST', { version: 3 }],
    [service.revoke('work-order-id', 3), '/fieldservice/work-orders/work-order-id', 'DELETE', { version: 3 }],
  ]
  for (const [request, path, method, body] of requests) {
    assert.equal(request.path, path)
    assert.equal(request.method, method)
    assert.deepEqual(request.body ? JSON.parse(request.body) : undefined, body)
  }
})
