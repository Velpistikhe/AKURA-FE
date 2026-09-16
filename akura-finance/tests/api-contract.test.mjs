import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { canEdit, documentPayload, formValues } from '../src/modules/documents/documentModel.js'
import { taxPayload } from '../src/modules/tax/taxModel.js'

const swagger = await fetch(process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json').then((response) => {
  assert.equal(response.status, 200)
  return response.json()
})
const source = (await readFile(new URL('../src/services/documentService.js', import.meta.url), 'utf8'))
  .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
const { documentService, getQuotationReference } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const id = '00000000-0000-4000-8000-000000000001'
function validate(schema, value) {
  if (schema.$ref) return validate(swagger.components.schemas[schema.$ref.split('/').pop()], value)
  if (value === null && schema.nullable) return
  if (schema.enum) assert.ok(schema.enum.includes(value))
  if (schema.type === 'object') {
    for (const key of schema.required || []) assert.notEqual(value[key], undefined, `Missing ${key}`)
    if (schema.minProperties) assert.ok(Object.keys(value).length >= schema.minProperties)
    for (const [key, entry] of Object.entries(value)) {
      if (schema.additionalProperties === false) assert.ok(schema.properties[key], `Unexpected ${key}`)
      if (schema.properties[key]) validate(schema.properties[key], entry)
    }
  }
  if (schema.type === 'integer') { assert.ok(Number.isInteger(value)); assert.ok(value >= schema.minimum) }
  if (schema.type === 'string') {
    assert.equal(typeof value, 'string')
    if (schema.minLength) assert.ok(value.length >= schema.minLength)
    if (schema.maxLength) assert.ok(value.length <= schema.maxLength)
    if (schema.format === 'date') assert.match(value, /^\d{4}-\d{2}-\d{2}$/)
  }
}
const values = { number: ' INV-001 ', title: ' Inspection ', date: '2026-09-13', dueDate: '', notes: '', tax: 99, total: '1' }
const quotation = { id, version: 7 }
for (const [kind, schemaName] of [['proforma-invoices', 'ProformaInvoice'], ['invoices', 'Invoice']]) {
  test(`${kind} requests and payloads match live Swagger`, () => {
    const service = documentService(kind)
    const payload = documentPayload(values, null, quotation, kind)
    assert.equal(Object.hasOwn(payload, 'number'), false)
    if (kind === 'invoices') {
      assert.equal(Object.hasOwn(payload, 'number'), false)
      assert.equal(Object.hasOwn(payload, 'date'), false)
    }
    validate(swagger.components.schemas[`${schemaName}Create`], payload)
    assert.equal(payload.quotationVersion, 7)
    assert.equal(payload.status, 'DRAFT')
    assert.equal(Object.hasOwn(payload, 'tax'), false)
    const record = { ...payload, id, version: 3, isActive: true }
    assert.equal(documentPayload(formValues(record), record, undefined, kind), null)
    assert.equal(documentPayload({ ...formValues(record), number: 'IGNORED' }, record, undefined, kind), null)
    const update = documentPayload({ ...formValues(record), title: 'Updated', quotationId: 'ignored', tax: 1 }, record, undefined, kind)
    if (kind === 'invoices') assert.equal(documentPayload({ ...formValues(record), number: 'IGNORED', date: '2030-01-01' }, record, undefined, kind), null)
    assert.deepEqual(update, { title: 'Updated', version: 3 })
    const requests = [service.create(payload), service.update(id, update), service.update(id, { status: 'FINAL', version: 3 }), service.remove(id, 3)]
    for (const request of requests) {
      const path = `/api/v1${request.path.replace(id, '{id}')}`
      const operation = swagger.paths[path][request.method.toLowerCase()]
      validate(operation.requestBody.content['application/json'].schema, JSON.parse(request.body))
    }
    const controller = new AbortController()
    for (const request of [service.list({ page: 2, limit: 20, status: 'DRAFT', search: '' }, { signal: controller.signal }), service.history(id, { page: 1, limit: 20 }, { signal: controller.signal })]) {
      assert.equal(request.signal, controller.signal)
      const url = new URL(request.path, 'http://localhost')
      const operation = swagger.paths[`/api/v1${url.pathname.replace(id, '{id}')}`].get
      for (const key of url.searchParams.keys()) assert.ok(operation.parameters.some((parameter) => parameter.name === key))
      assert.equal(url.searchParams.has('search'), false)
    }
    assert.ok(swagger.paths[`/api/v1${service.get(id).path.replace(id, '{id}')}`].get)
    assert.equal(canEdit(record), true)
    assert.equal(canEdit({ ...record, status: 'FINAL' }), false)
    assert.equal(canEdit({ ...record, isActive: false }), false)
  })
}
test('Quotation references use the documented Finance-accessible read endpoint', () => {
  const request = getQuotationReference(id)
  assert.ok(swagger.paths[`/api/v1${request.path.replace(id, '{quotationId}')}`].get)
  assert.equal(getQuotationReference('a/b').path, '/marketing/quotation-references/a%2Fb')
})

test('Tax requests match live Swagger public endpoints and payloads', async () => {
  const source = (await readFile(new URL('../src/services/taxService.js', import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  const { taxService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  const controller = new AbortController()
  for (const request of [taxService.list({ page: 2, limit: 20, search: 'ignored' }, { signal: controller.signal }), taxService.deliveries({}, { signal: controller.signal })]) {
    const url = new URL(request.path, 'http://localhost')
    const operation = swagger.paths[`/api/v1${url.pathname}`].get
    assert.equal(request.method, 'GET')
    assert.equal(request.signal, controller.signal)
    for (const key of url.searchParams.keys()) assert.ok(operation.parameters.some((parameter) => parameter.name === key))
    assert.equal(url.searchParams.has('search'), false)
  }
  const request = taxService.create({ ...taxPayload({ percentage: '11.25', effectiveFrom: '2026-10-01' }), officeBranchId: 'ignored' })
  const payload = JSON.parse(request.body)
  const schema = swagger.paths[`/api/v1${request.path}`].post.requestBody.content['application/json'].schema
  validate(schema, payload)
  assert.equal(request.method, 'POST')
  assert.equal(Object.hasOwn(payload, 'officeBranchId'), false)
  assert.match(payload.percentage, new RegExp(schema.properties.percentage.oneOf.find((entry) => entry.type === 'string').pattern))
  const resync = taxService.resync()
  assert.equal(resync.method, 'POST')
  assert.deepEqual(JSON.parse(resync.body), {})
  validate(swagger.paths[`/api/v1${resync.path}`].post.requestBody.content['application/json'].schema, JSON.parse(resync.body))
})
