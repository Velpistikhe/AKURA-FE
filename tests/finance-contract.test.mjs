import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../akura-finance/src/${path}`, import.meta.url), 'utf8')
const load = code => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const spec = await fetch(process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json').then(response => {
  assert.equal(response.ok, true, 'Local Swagger must be available')
  return response.json()
})
const id = '00000000-0000-4000-8000-000000000001'

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
  if (schema.type === 'string') { assert.equal(typeof value, 'string'); if (schema.maxLength) assert.ok(value.length <= schema.maxLength); if (schema.minLength) assert.ok(value.length >= schema.minLength); if (schema.format === 'uuid') assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); if (schema.format === 'date') assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value) }
}

test('Finance quotation references use the documented read-only endpoints', async () => {
  const { quotationService } = await load((await read('services/quotationService.js')).replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })'))
  const list = quotationService.list()
  const detail = quotationService.get(id)
  assert.equal(list.path, '/marketing/quotation-references')
  assert.equal(detail.path, `/marketing/quotation-references/${id}`)
  for (const request of [list, detail]) assert.ok(spec.paths[`/api/v1${request.path.replace(id, '{quotationId}')}`].get)
  assert.deepEqual(Object.keys(quotationService).sort(), ['get', 'list'])
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
      await assert.rejects(api.apiRequest('/marketing/quotation-references'), error => error.status === status)
      assert.equal(calls, 1)
    }
  } finally { globalThis.fetch = originalFetch }
})

test('canceling a quotation reference request does not refresh the session or retry', async () => {
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
    const request = api.apiRequest('/marketing/quotation-references', { signal: controller.signal })
    controller.abort()
    await assert.rejects(request, error => error.name === 'AbortError')
    assert.equal(calls, 1)
  } finally { globalThis.fetch = originalFetch }
})


test('Field Service work order payloads match live Swagger', async () => {
  const root = new URL('../akura-fieldservice/src/', import.meta.url)
  const field = await load(await readFile(new URL('modules/work-order/workOrderModel.js', root), 'utf8'))
  const itemSizeId = '00000000-0000-4000-8000-000000000002'
  const quotation = { id }
  // The quotation option list carries no lines, so membership comes from the detail.
  const quotationItems = [{ itemSizeId, itemName: 'Gauge' }]
  const rows = [{ ...quotationItems[0], selected: true, quantityInspection: '1', quantityMaintenance: '0' }]
  const create = field.workOrderCreatePayload(
    { startDate: '2026-09-15', endDate: '2026-09-18', inspectors: [id] },
    { quotation, items: rows, inspectors: [{ id, name: 'Budi Santoso' }], quotationItems },
  )
  matches(create, spec.components.schemas.WorkOrderCreate)

  const record = {
    id, version: 3, status: 'DRAFT', quotationId: id,
    startDate: '2026-09-15T00:00:00.000Z', endDate: '2026-09-18T00:00:00.000Z',
    inspectors: [{ name: 'Budi Santoso' }],
  }
  const patch = field.workOrderUpdatePayload(
    { startDate: '2026-09-15', endDate: '2026-09-20', status: 'COMPLETED', inspectors: ['Budi Santoso'] },
    record,
  )
  matches(patch, spec.components.schemas.WorkOrderUpdate)
  // WorkOrderUpdate forbids extra properties and requires at least two of them.
  assert.equal(Object.hasOwn(patch, 'summary'), false)
  assert.ok(Object.keys(patch).length >= spec.components.schemas.WorkOrderUpdate.minProperties)
  // PATCH rejects IN_PROGRESS; the transition belongs to POST /{id}/start.
  assert.throws(() => field.workOrderUpdatePayload(
    { startDate: '2026-09-15', endDate: '2026-09-18', status: 'IN_PROGRESS', inspectors: [] }, record,
  ))
  assert.equal(field.WORK_ORDER_PATCH_STATUSES.includes('IN_PROGRESS'), false)
  assert.equal(field.WORK_ORDER_STATUSES.includes('IN_PROGRESS'), true)
})
