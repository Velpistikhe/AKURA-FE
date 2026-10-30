import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const load = code => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const read = path => readFile(new URL(`../akura-marketing/src/${path}`, import.meta.url), 'utf8')
const access = await read('modules/quotation/quotationAccess.js')
const model = await load((await read('modules/quotation/invoiceActionModel.js')).replace("import { canManageQuotations } from './quotationAccess'", access))
const id = '00000000-0000-4000-8000-000000000001'
const values = { kind: 'INVOICE', dueDate: '2099-12-31', location: ' Jakarta ', purchaseOrderNumber: ' PO-001 ', purchaseOrderDate: '2026-10-01', notes: 'excluded' }
const quotation = { id, isActive: true, status: 'APPROVED' }

test('only Marketing can create documents from eligible quotations', () => {
  for (const section of ['MARKETING', 'FINANCE', 'FIELDSERVICE', undefined]) {
    assert.equal(model.canCreateFinanceDocument({ section }, quotation), section === 'MARKETING')
  }
  const user = { section: 'MARKETING' }
  for (const status of ['DRAFT', 'SUBMITTED', 'REJECTED']) assert.equal(model.canCreateFinanceDocument(user, { ...quotation, status }), false)
  assert.equal(model.canCreateFinanceDocument(user, { ...quotation, isActive: false }), false)
  for (const status of [undefined, 'DRAFT', 'IN_PROGRESS', 'COMPLETED']) {
    assert.equal(model.canCreateFinanceDocument(user, { ...quotation, hasWorkOrder: true, workOrderStatus: status }), status === 'COMPLETED')
  }
  assert.equal(model.canCreateFinanceDocument(user, { ...quotation, workOrderId: id }), false)
})

test('payload matches both document kinds and validates required fields', () => {
  for (const kind of ['INVOICE', 'PROFORMA_INVOICE']) {
    assert.deepEqual(model.financeDocumentPayload(id, { ...values, kind }), { quotationId: id, kind, dueDate: values.dueDate, location: 'Jakarta', purchaseOrderNumber: 'PO-001', purchaseOrderDate: values.purchaseOrderDate })
  }
  for (const purchaseOrderNumber of ['', ' ', undefined, 'x'.repeat(101)]) assert.throws(() => model.financeDocumentPayload(id, { ...values, purchaseOrderNumber }))
  for (const purchaseOrderDate of ['', undefined, '2026-02-30', '2026-13-01']) assert.throws(() => model.financeDocumentPayload(id, { ...values, purchaseOrderDate }))
  for (const location of ['', '   ', undefined, 'x'.repeat(256)]) assert.throws(() => model.financeDocumentPayload(id, { ...values, location }))
  assert.equal(model.financeDocumentPayload(id, { ...values, location: 'x'.repeat(255) }).location.length, 255)
  for (const dueDate of ['', undefined, '2026-02-30', '2020-01-01']) assert.throws(() => model.financeDocumentPayload(id, { ...values, dueDate }))
  assert.throws(() => model.financeDocumentPayload(id, { ...values, kind: 'INVALID' }))
  assert.equal(model.validateFinanceDocumentDate('2026-10-28', '2026-10-28'), null)
  assert.ok(model.validateFinanceDocumentDate('2026-10-27', '2026-10-28'))
  assert.equal(model.financeDocumentDate(new Date(2026, 0, 2)), '2026-01-02')
})

test('service posts six fields with URL ID through mocked fetch and propagates errors', async () => {
  const requests = []
  const api = await read('services/api.js')
  const apiModule = await load(api.replaceAll('import.meta.env', '({ PROD: false })'))
  globalThis.__invoiceApiRequest = apiModule.apiRequest
  const { quotationService } = await load((await read('services/quotationService.js')).replace("import { apiRequest } from './api'", 'const apiRequest = globalThis.__invoiceApiRequest'))
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options })
      return new Response(JSON.stringify({ data: { id } }), { status: 201 })
    }
    await quotationService.createInvoice(id, { ...values, quotationId: 'wrong' })
    assert.ok(requests[0].url.endsWith(`/marketing/quotations/${id}/invoices`))
    assert.equal(requests[0].options.method, 'POST')
    assert.deepEqual(JSON.parse(requests[0].options.body), { quotationId: id, kind: values.kind, dueDate: values.dueDate, location: values.location, purchaseOrderNumber: values.purchaseOrderNumber, purchaseOrderDate: values.purchaseOrderDate })
    for (const status of [400, 403, 404, 409, 503]) {
      let calls = 0
      globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ message: 'Rejected' }), { status }) }
      await assert.rejects(quotationService.createInvoice(id, values), error => error.status === status)
      assert.equal(calls, 1)
    }
  } finally { globalThis.fetch = originalFetch; delete globalThis.__invoiceApiRequest }
})

test('submit handler prevents concurrent requests and refreshes after success or stale access', async () => {
  const source = (await read('modules/quotation/CreateInvoiceAction.jsx')).replaceAll('\r\n', '\n')
  const body = source.match(/const save = async \(values\) => \{([\s\S]*?)\n  \}\n  if \(!allowed\)/)[1]
  const makeSave = new Function('allowed', 'lock', 'setBusy', 'setError', 'quotationService', 'quotation', 'financeDocumentPayload', 'setOpen', 'message', 'onCreated', `return async (values) => {${body}}`)
  for (const status of [201, 403, 404, 409, 503]) {
    let release
    const pending = new Promise(resolve => { release = resolve })
    let calls = 0; let refreshed = 0; let closed = false; let error = ''
    const lock = { current: false }
    const save = makeSave(true, lock, () => {}, value => { error = value }, { createInvoice: async () => {
      calls++; await pending
      if (status !== 201) throw Object.assign(new Error('Rejected'), { status })
    } }, quotation, model.financeDocumentPayload, () => { closed = true }, { success() {} }, async () => { refreshed++ })
    const first = save(values)
    await save(values)
    assert.equal(calls, 1)
    release(); await first
    assert.equal(lock.current, false)
    assert.equal(closed, status === 201)
    assert.equal(refreshed, status === 503 ? 0 : 1)
    if (status === 503) assert.match(error, /unavailable/)
  }
})
