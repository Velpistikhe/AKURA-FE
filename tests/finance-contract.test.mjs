import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../akura-finance/src/${path}`, import.meta.url), 'utf8')
const load = code => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const model = await load(await read('modules/documents/documentModel.js'))
const spec = await fetch(process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json').then(response => {
  assert.equal(response.ok, true, 'Local Swagger must be available')
  return response.json()
})
const id = '00000000-0000-4000-8000-000000000001'
const values = { companyId: id, title: ' Service ', purchaseOrderNumber: ' PO-001 ', purchaseOrderDate: '2026-10-01', items: [id], dueDate: '2099-12-31', notes: ' note ', location: ' Jakarta ' }

// Validate emitted payload shape against the live contract, including nested refs.
function matches(value, schema) {
  assert.ok(schema, 'Schema must exist in current Swagger')
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
    if (schema.uniqueItems) assert.equal(new Set(value.map(item => JSON.stringify(item))).size, value.length)
    for (const item of value) matches(item, schema.items)
  }
  if (schema.type === 'string') { assert.equal(typeof value, 'string'); if (schema.maxLength) assert.ok(value.length <= schema.maxLength); if (schema.minLength) assert.ok(value.length >= schema.minLength); if (schema.format === 'uuid') assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); if (schema.format === 'date') assert.ok(model.isValidDate(value)) }
}

test('purchase order payload matches live Swagger for both Finance document kinds', () => {
  const payload = model.documentPayload({ ...values, source: 'QUOTATION', quotation: {}, officeBranchId: id, date: '2020-01-01', priceInspection: '1', quantityInspection: '5' })
  for (const kind of ['INVOICE', 'PROFORMA_INVOICE']) matches({ ...payload, kind }, spec.components.schemas.FinanceDocumentCreate)
  assert.deepEqual(payload, { companyId: id, title: 'Service', purchaseOrderNumber: 'PO-001', purchaseOrderDate: '2026-10-01', location: 'Jakarta', items: [id], dueDate: '2099-12-31', notes: 'note' })
  const optional = model.documentPayload({ ...values, dueDate: '', notes: '', location: '' })
  assert.equal(optional.dueDate, null)
  assert.equal(optional.location, null)
  assert.equal(optional.notes, null)
})

test('document picker uses available company prices for display and submits only item IDs', () => {
  const row = { id, priceStatus: 'AVAILABLE', catalogActive: true, priceSource: 'CONTRACT', priceInspection: '200', priceMaintenance: '100', catalogSnapshot: { itemName: 'Gauge', serviceName: 'Inspection', size: null } }
  const option = model.documentOptionValues(row)
  assert.equal(option.itemName, 'Gauge')
  assert.equal(option.size, null)
  assert.equal(option.priceInspection, '200')
  for (const changes of [{ priceStatus: 'UNAVAILABLE' }, { catalogActive: false }, { priceSource: 'UNKNOWN' }, { priceInspection: null }]) assert.equal(model.documentOptionValues({ ...row, ...changes }), null)
  const fallback = model.documentOptionValues({ ...row, catalogSnapshot: undefined, priceInspection: undefined, priceService: '150', item: { name: 'Item', service: { name: 'Service' } }, size: 'Small' })
  assert.equal(fallback.priceInspection, '150')
  assert.equal(fallback.itemName, 'Item')
  const payload = model.documentPayload({ ...values, items: [row.id], catalog: { [id]: option } })
  assert.deepEqual(payload.items, [id])
  assert.equal(Object.hasOwn(payload, 'catalog'), false)
  assert.deepEqual(model.formValues().items, [])
})

test('document option requests use Swagger query parameters without branch overrides', async () => {
  const service = await load((await read('services/documentOptionService.js')).replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })'))
  for (const request of [service.documentOptionService.companies({ page: 2, limit: 20, search: 'Acme & Co' }), service.documentOptionService.items({ companyId: id, page: 1, limit: 20, itemName: 'Gauge', serviceName: '', size: undefined, exclude: id })]) {
    const url = new URL(request.path, 'http://localhost')
    const operation = spec.paths[`/api/v1${url.pathname}`].get
    const parameters = operation.parameters.filter(parameter => parameter.in === 'query')
    for (const name of url.searchParams.keys()) assert.ok(parameters.some(parameter => parameter.name === name))
    for (const parameter of parameters.filter(parameter => parameter.required)) assert.ok(url.searchParams.has(parameter.name))
    assert.equal(url.searchParams.has('officeBranchId'), false)
    assert.equal(url.searchParams.has('size'), false)
  }
})

test('purchase order validation rejects invalid IDs, dates, required fields and duplicate items', () => {
  for (const items of [[], [id, id], [id, id.toUpperCase()], Array(101).fill(id), ['bad'], [{ itemSizeId: id }]]) assert.throws(() => model.documentPayload({ ...values, items }))
  for (const companyId of ['', 'bad', undefined]) assert.throws(() => model.documentPayload({ ...values, companyId }))
  for (const title of ['', '  ', 'x'.repeat(256)]) assert.throws(() => model.documentPayload({ ...values, title }))
  for (const purchaseOrderNumber of ['', '  ', undefined, 'x'.repeat(101)]) assert.throws(() => model.documentPayload({ ...values, purchaseOrderNumber }))
  for (const purchaseOrderDate of ['', undefined, '2026-02-30', '2026-13-01']) assert.throws(() => model.documentPayload({ ...values, purchaseOrderDate }))
  assert.throws(() => model.documentPayload({ ...values, location: 'x'.repeat(256) }))
  assert.throws(() => model.documentPayload({ ...values, dueDate: '2020-01-01' }))
  assert.deepEqual(model.documentPayload({ ...values, items: [` ${id.toUpperCase()} `] }).items, [id])
  const uppercaseId = 'abcdefab-abcd-4abc-8abc-abcdefabcdef'
  assert.throws(() => model.documentPayload({ ...values, items: [uppercaseId, uppercaseId.toUpperCase()] }))
})

test('purchase order submission makes one request under concurrent submits and keeps conflicts recoverable', async () => {
  const source = (await read('modules/documents/DocumentPage.jsx')).replaceAll('\r\n', '\n')
  const runBody = source.match(/const run = async \(action\) => \{([\s\S]*?)\n  \}\n  const edit/)[1]
  const saveBody = source.match(/const save = \(values\) => run\(async \(\) => \{([\s\S]*?)\n  \}\)/)[1]
  for (const status of [201, 409]) {
    const lock = { current: false }
    let calls = 0; let stale = false; let closed = false; let release
    const pending = new Promise(resolve => { release = resolve })
    const message = { error() {}, warning() {}, success() {}, info() {} }
    const run = new Function('lock', 'setBusy', 'message', 'setStale', 'setDetail', 'setReload', `return async (action) => {${runBody}}`)(lock, () => {}, message, value => { stale = value }, () => {}, () => {})
    const service = { create: async payload => {
      calls++
      matches({ ...payload, kind: 'INVOICE' }, spec.components.schemas.FinanceDocumentCreate)
      await pending
      if (status === 409) throw Object.assign(new Error('Conflict'), { status })
      return { data: { id } }
    } }
    const save = new Function('run', 'stale', 'documentPayload', 'editor', 'message', 'service', 'setEditor', 'setDetail', 'setReload', 'title', `return values => run(async () => {${saveBody}})`)(run, false, model.documentPayload, { record: null }, message, service, () => { closed = true }, () => {}, () => {}, 'Invoice')
    const first = save(values)
    await save(values)
    assert.equal(calls, 1)
    release(); await first
    assert.equal(lock.current, false)
    assert.equal(stale, status === 409)
    assert.equal(closed, status === 201)
  }
})

test('updates omit immutable dates and require approval before finalization', () => {
  const original = { source: 'QUOTATION', date: '2026-01-01', dueDate: '2099-12-31', title: 'Original', notes: null, version: 3 }
  const payload = model.documentPayload({ ...model.formValues(original), title: 'Changed', date: '2030-01-01' }, original)
  assert.deepEqual(payload, { title: 'Changed', version: 3 })
  matches(payload, spec.components.schemas.FinanceDocumentUpdate)
  assert.equal(model.documentPayload(model.formValues(original), original), null)
  const purchaseOrder = { ...original, source: 'DIRECT', purchaseOrderNumber: 'PO-001', purchaseOrderDate: '2026-01-01' }
  const changes = model.documentPayload({ ...model.formValues(purchaseOrder), dueDate: '', purchaseOrderNumber: 'Changed', purchaseOrderDate: '2030-01-01', location: 'Changed', items: [id] }, purchaseOrder)
  assert.deepEqual(changes, { dueDate: null, version: 3 })
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
  assert.throws(() => service.documentService('unknown'))
  for (const kind of ['invoices', 'proforma-invoices']) {
    const documents = service.documentService(kind)
    const documentKind = kind === 'invoices' ? 'INVOICE' : 'PROFORMA_INVOICE'
    const controller = new AbortController()
    const list = documents.list({ page: 2, limit: 20, status: 'DRAFT', kind: 'OTHER' }, { signal: controller.signal })
    const url = new URL(list.path, 'http://localhost')
    assert.equal(url.pathname, '/finance/documents')
    assert.equal(url.searchParams.get('kind'), documentKind)
    assert.equal(url.searchParams.get('page'), '2')
    assert.equal(url.searchParams.get('status'), 'DRAFT')
    assert.equal(list.signal, controller.signal)
    const created = documents.create({ ...model.documentPayload(values), kind: 'OTHER' })
    assert.equal(created.path, '/finance/documents')
    assert.equal(created.method, 'POST')
    matches(JSON.parse(created.body), spec.components.schemas.FinanceDocumentCreate)
    assert.equal(JSON.parse(created.body).kind, documentKind)
    assert.equal(documents.get(id).path, `/finance/documents/${id}`)
    const update = documents.update(id, { version: 3, status: 'FINAL' })
    assert.equal(update.path, `/finance/documents/${id}`)
    assert.equal(update.method, 'PATCH')
    matches(JSON.parse(update.body), spec.components.schemas.FinanceDocumentUpdate)
    const removed = documents.remove(id, 3)
    assert.equal(removed.path, `/finance/documents/${id}`)
    assert.equal(removed.method, 'DELETE')
    matches(JSON.parse(removed.body), spec.components.schemas.FinanceDocumentDelete)
    const history = documents.history(id, { page: 1, limit: 20 }, { signal: controller.signal })
    assert.equal(history.path, `/finance/documents/${id}/history?page=1&limit=20`)
    assert.equal(history.signal, controller.signal)
    const request = service.documentService(kind).approve(id, 3)
    assert.ok(spec.paths[`/api/v1/finance/documents/{id}/approve`].post)
    assert.equal(request.path, `/finance/documents/${id}/approve`)
    matches(JSON.parse(request.body), spec.components.schemas.FinanceDocumentApprove)
  }
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
      return new Response(JSON.stringify({ data: { id } }), { status: 200 })
    }
    assert.equal((await api.apiRequest(`/marketing/quotation-references/${id}`)).data.id, id)
    assert.equal(calls, 1)
    for (const status of [400, 403, 404, 409, 503]) {
      calls = 0
      globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ message: 'Rejected' }), { status }) }
      await assert.rejects(api.apiRequest('/finance/documents', { method: 'POST', body: '{}' }), error => error.status === status)
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
    const request = api.apiRequest('/finance/documents?page=1&limit=20', { signal: controller.signal })
    controller.abort()
    await assert.rejects(request, error => error.name === 'AbortError')
    assert.equal(calls, 1)
  } finally { globalThis.fetch = originalFetch }
})
