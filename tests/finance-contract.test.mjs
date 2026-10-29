import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../akura-finance/src/${path}`, import.meta.url), 'utf8')
const load = code => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const model = await load(await read('modules/documents/documentModel.js'))
const action = await load(await read('modules/quotation/invoiceActionModel.js'))
const spec = await fetch(process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json').then(response => {
  assert.equal(response.ok, true, 'Local Swagger must be available')
  return response.json()
})
const id = '00000000-0000-4000-8000-000000000001'
const quotation = { id, officeBranchId: id, version: 2, isActive: true, status: 'APPROVED', subject: 'Inspection', tax: '11', subTotal: '100', taxAmount: '11', total: '111', items: [{ id, position: 0, itemSizeId: id, serviceName: 'Service', serviceType: 'INSPECTION', itemName: 'Item', size: null, note: null, quantityInspection: '1', quantityMaintenance: '0', priceInspection: '100', priceMaintenance: null, discount: '0', subTotal: '100' }] }
const values = { source: 'QUOTATION', dueDate: '2099-12-31', notes: ' note ' }

// Validate emitted payload shape against the live contract, including nested refs.
function matches(value, schema) {
  if (schema.$ref) return matches(value, spec.components.schemas[schema.$ref.split('/').at(-1)])
  if (value === null && schema.nullable) return
  if (schema.enum) assert.ok(schema.enum.includes(value))
  if (schema.type === 'object') {
    assert.equal(typeof value, 'object'); assert.notEqual(value, null)
    for (const key of schema.required || []) assert.ok(Object.hasOwn(value, key), `Missing ${key}`)
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) assert.ok(Object.hasOwn(schema.properties, key), `Unexpected ${key}`)
    for (const [key, child] of Object.entries(schema.properties || {})) if (Object.hasOwn(value, key)) matches(value[key], child)
  }
  if (schema.type === 'array') {
    assert.ok(Array.isArray(value))
    if (schema.minItems) assert.ok(value.length >= schema.minItems)
    if (schema.maxItems) assert.ok(value.length <= schema.maxItems)
    for (const item of value) matches(item, schema.items)
  }
  if (schema.type === 'string') { assert.equal(typeof value, 'string'); if (schema.maxLength) assert.ok(value.length <= schema.maxLength) }
}

test('quotation creation uses full fresh snapshot for both Finance kinds', () => {
  const payload = model.documentPayload(values, null, quotation)
  for (const kind of ['Invoice', 'ProformaInvoice']) matches(payload, spec.components.schemas[`${kind}QuotationCreate`])
  assert.equal(payload.quotation, quotation)
  assert.equal(payload.notes, 'note')
  matches(action.invoicePayload(values, quotation), spec.components.schemas.InvoiceQuotationCreate)
  assert.throws(() => model.documentPayload({ ...values, dueDate: '' }, null, quotation))
  assert.throws(() => model.documentPayload(values, null, { ...quotation, status: 'CREATED' }))
})

test('direct payload uses resolved company prices and excludes discounts/branch/date', () => {
  const input = { source: 'DIRECT', companyId: id, title: ' Service ', items: [{ itemSizeId: id, quantityInspection: '1.25', quantityMaintenance: '0', discount: '50', priceInspection: '1' }] }
  const prices = { company: { id }, items: [{ itemSizeId: id, priceInspection: '200', priceMaintenance: null }] }
  const payload = model.documentPayload(input, null, null, prices)
  for (const kind of ['Invoice', 'ProformaInvoice']) matches(payload, spec.components.schemas[`${kind}DirectCreate`])
  assert.equal(payload.items[0].priceInspection, '200')
  assert.equal(payload.dueDate, null)
  assert.equal(Object.hasOwn(payload.items[0], 'discount'), false)
  for (const items of [[], [input.items[0], input.items[0]]]) assert.throws(() => model.documentPayload({ ...input, items }, null, null, prices))
  assert.throws(() => model.documentPayload(input, null, null, { ...prices, company: { id: 'other' } }))
  assert.throws(() => model.documentPayload(input, null, null, { ...prices, items: [] }))
  for (const quantityInspection of ['0', '-1', '1.1234']) assert.throws(() => model.documentPayload({ ...input, items: [{ ...input.items[0], quantityInspection }] }, null, null, prices))
  assert.throws(() => model.documentPayload({ ...input, items: [{ ...input.items[0], quantityMaintenance: '1' }] }, null, null, prices))
})

test('updates omit immutable dates and require approval before finalization', () => {
  const original = { source: 'QUOTATION', date: '2026-01-01', dueDate: '2099-12-31', title: 'Original', notes: null, version: 3 }
  const payload = model.documentPayload({ ...model.formValues(original), title: 'Changed', date: '2030-01-01' }, original)
  assert.deepEqual(payload, { title: 'Changed', version: 3 })
  for (const kind of ['Invoice', 'ProformaInvoice']) matches(payload, spec.components.schemas[`${kind}Update`])
  assert.equal(model.documentPayload(model.formValues(original), original), null)
  assert.throws(() => model.documentPayload({ ...model.formValues(original), dueDate: '' }, original))
  assert.equal(model.canEdit({ isActive: true, status: 'DRAFT' }), true)
  assert.equal(model.canFinalize({ isActive: true, status: 'DRAFT' }), false)
  assert.equal(model.canFinalize({ isActive: true, status: 'ON_PROGRESS' }), true)
  assert.equal(model.canEdit({ isActive: true, status: 'FINAL' }), false)
  assert.equal(model.validateDueDate('2026-02-30'), 'Enter a valid due date.')
  assert.ok(model.validateDueDate('2025-12-31', '2026-01-01'))
})

test('service operations and Marketing references match documented paths', async () => {
  const source = (await read('services/documentService.js')).replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  const service = await load(source)
  for (const kind of ['invoices', 'proforma-invoices']) {
    const request = service.documentService(kind).approve(id, 3)
    assert.ok(spec.paths[`/api/v1/finance/${kind}/{id}/approve`].post)
    assert.equal(request.path, `/finance/${kind}/${id}/approve`)
    matches(JSON.parse(request.body), spec.components.schemas[kind === 'invoices' ? 'InvoiceApprove' : 'ProformaInvoiceApprove'])
  }
  const priceRequest = service.resolveBillingPrices(id, [id])
  assert.equal(priceRequest.path, '/marketing/billing-price-references')
  matches(JSON.parse(priceRequest.body), spec.components.schemas.BillingPriceRequest)
  const references = await load((await read('services/quotationService.js')).replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })'))
  assert.equal(references.quotationService.list().path, '/marketing/quotation-references')
  assert.equal(references.quotationService.get(id).path, `/marketing/quotation-references/${id}`)
})

test('Marketing create payload still matches current Swagger and Jakarta date', async () => {
  const root = new URL('../akura-marketing/src/modules/quotation/', import.meta.url)
  const access = await readFile(new URL('quotationAccess.js', root), 'utf8')
  const marketing = await load((await readFile(new URL('invoiceActionModel.js', root), 'utf8')).replace("import { canManageQuotations } from './quotationAccess'", access))
  matches(marketing.financeDocumentPayload(id, { kind: 'INVOICE', dueDate: values.dueDate, location: 'Jakarta' }), spec.components.schemas.CreateFinanceDocumentFromQuotationRequest)
  assert.equal(marketing.financeDocumentDate(new Date('2026-10-27T18:00:00Z')), '2026-10-28')
})

test('Finance forwards the session token for Marketing references and never retries non-auth errors', async () => {
  const api = await load((await read('services/api.js')).replaceAll('import.meta.env', '({ PROD: false })'))
  api.setAccessToken('test-session-token')
  const originalFetch = globalThis.fetch
  try {
    let calls = 0
    globalThis.fetch = async (url, options) => {
      calls++
      assert.ok(url.endsWith(`/marketing/quotation-references/${id}`))
      assert.equal(options.headers.get('Authorization'), 'Bearer test-session-token')
      assert.equal(options.credentials, 'include')
      return new Response(JSON.stringify({ data: quotation }), { status: 200 })
    }
    assert.equal((await api.apiRequest(`/marketing/quotation-references/${id}`)).data.id, id)
    assert.equal(calls, 1)
    for (const status of [400, 403, 404, 409, 503]) {
      calls = 0
      globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ message: 'Rejected' }), { status }) }
      await assert.rejects(api.apiRequest('/finance/invoices', { method: 'POST', body: '{}' }), error => error.status === status)
      assert.equal(calls, 1)
    }
  } finally { globalThis.fetch = originalFetch }
})

test('canceling a document list request does not refresh the session or retry', async () => {
  const api = await load((await read('services/api.js')).replaceAll('import.meta.env', '({ PROD: false })'))
  const originalFetch = globalThis.fetch
  const controller = new AbortController()
  let calls = 0
  try {
    globalThis.fetch = async (_, options) => {
      calls++
      assert.equal(options.signal, controller.signal)
      return new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Request aborted', 'AbortError')), { once: true })
      })
    }
    const request = api.apiRequest('/finance/invoices?page=1&limit=20', { signal: controller.signal })
    controller.abort()
    await assert.rejects(request, error => error.name === 'AbortError')
    assert.equal(calls, 1)
  } finally { globalThis.fetch = originalFetch }
})
