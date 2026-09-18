import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createItemPayload } from '../src/modules/item/itemModel.js'
import { canApproveQuotation, quotationNumber, quotationChanges, quotationFormValues, quotationPayload, quotationOptionValues, TEXT_FIELDS, QUANTITY_PATTERN } from '../src/modules/quotation/quotationModel.js'

const swagger = process.env.SWAGGER_FILE ? JSON.parse(await readFile(process.env.SWAGGER_FILE, 'utf8')) : await fetch(process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json').then((response) => {
  assert.equal(response.status, 200, 'Local Swagger must be available')
  return response.json()
})
const resolve = (schema) => schema?.$ref ? resolve(swagger.components.schemas[schema.$ref.split('/').pop()]) : schema
const uuid = '00000000-0000-4000-8000-000000000001'

test('Create item supports automatic sizeless variants and requires UOM', async () => {
  const service = await loadService('itemService')
  for (const sizes of [undefined, []]) {
    const request = service.create(createItemPayload({ serviceId: uuid, name: ' Pipe ', uom: ' JOINT ', sizes }))
    const body = JSON.parse(request.body)
    const schema = resolve(operation(request).requestBody.content['application/json'].schema)
    assert.equal(request.method, 'POST')
    assertBody(schema, body)
    assert.ok(schema.required.includes('uom'))
    assert.deepEqual(body, { serviceId: uuid, name: 'Pipe', uom: 'JOINT', sizes: [] })
    assert.equal(schema.properties.sizes.minItems || 0, 0)
  }
})

test('Create item preserves named sizes without sending prices', async () => {
  const service = await loadService('itemService')
  const request = service.create(createItemPayload({ serviceId: uuid, name: 'Pipe', uom: 'JOINT',
    sizes: [{ size: ' 1 inch ', priceServicePrimary: '100' }, { size: ' 2 inch ', id: uuid }] }))
  const body = JSON.parse(request.body)
  const schema = resolve(operation(request).requestBody.content['application/json'].schema)
  assertBody(schema, body)
  const sizeSchema = resolve(schema.properties.sizes.items)
  assert.equal(sizeSchema.properties.size.nullable, true)
  assert.deepEqual(body.sizes, [{ size: '1 inch' }, { size: '2 inch' }])
  for (const size of body.sizes) assertBody(sizeSchema, size)
})

test('Create standalone item omits service and sends optional trimmed scopes', async () => {
  const service = await loadService('itemService')
  for (const serviceId of [undefined, null, '']) {
    const request = service.create(createItemPayload({ serviceId, name: ' Pipe ', uom: ' JOINT ',
      inspectionScopes: [' Visual inspection '], maintenanceScopes: [' Cleaning '], sizes: [{ size: null }] }))
    const body = JSON.parse(request.body)
    assertBody(operation(request).requestBody.content['application/json'].schema, body)
    assert.deepEqual(body, { name: 'Pipe', uom: 'JOINT', inspectionScopes: ['Visual inspection'], maintenanceScopes: ['Cleaning'], sizes: [{ size: null }] })
  }
  const request = service.create(createItemPayload({ name: 'Pipe', uom: 'JOINT' }))
  const body = JSON.parse(request.body)
  assertBody(operation(request).requestBody.content['application/json'].schema, body)
  assert.deepEqual(body, { name: 'Pipe', uom: 'JOINT', inspectionScopes: [], maintenanceScopes: [], sizes: [] })
  const schema = swagger.components.schemas.CreateItemRequest
  assert.equal(schema.required.includes('serviceId'), false)
  for (const key of ['inspectionScopes', 'maintenanceScopes']) {
    assert.equal(schema.properties[key].maxItems, 100)
    assert.equal(schema.properties[key].items.maxLength, 500)
    assert.equal(schema.properties[key].uniqueItems, true)
  }
})

test('Selecting a service excludes previously entered standalone scopes', () => {
  assert.deepEqual(createItemPayload({ serviceId: uuid, name: 'Pipe', uom: 'JOINT',
    inspectionScopes: ['Visual inspection'], maintenanceScopes: ['Cleaning'] }),
  { serviceId: uuid, name: 'Pipe', uom: 'JOINT', sizes: [] })
})

test('Create item rejects a direct-price variant combined with other sizes', () => {
  assert.throws(() => createItemPayload({ name: 'Pipe', uom: 'JOINT', sizes: [{ size: null }, { size: '2 inch' }] }), /cannot be combined/)
})

test('Draft numbering and approval eligibility follow the quotation lifecycle', () => {
  assert.equal(quotationNumber({ no: null, numberYear: null, revision: 0 }), 'Draft')
  assert.equal(quotationNumber({ no: null, numberYear: null, revision: 2 }), 'Draft - Revision 2')
  assert.equal(quotationNumber({ no: 1, numberYear: 2026, revision: 2 }), '1/2026 - Revision 2')
  for (const status of ['CREATED', 'SENT', 'REVISED']) {
    assert.equal(canApproveQuotation({ status, isActive: true }), true)
    assert.equal(canApproveQuotation({ status, isActive: false }), false)
  }
  for (const status of ['APPROVED', 'REJECTED', 'COMPLETE']) assert.equal(canApproveQuotation({ status, isActive: true }), false)
})

test('Approval sends only the latest concurrency version to the documented endpoint', async () => {
  const service = await loadService('quotationService')
  const request = service.approve(uuid, 4)
  assert.equal(request.method, 'POST')
  assert.equal(request.path, `/marketing/quotations/${uuid}/approve`)
  assert.deepEqual(JSON.parse(request.body), { version: 4 })
  assertBody(operation(request).requestBody.content['application/json'].schema, JSON.parse(request.body))
})

test('Historical lines and revision metadata never enter an editable payload', () => {
  const revision = { ...record, no: null, numberYear: null, previousQuotationId: uuid, pdfDocument: { id: uuid },
    items: [...record.items, { ...record.items[0], id: 'historical', isActive: false }] }
  const values = quotationFormValues(revision)
  assert.equal(values.items.length, 1)
  assert.deepEqual(quotationChanges(values, revision), {})
  const payload = quotationPayload(values, { create: true })
  assertBody(swagger.components.schemas.CreateQuotationRequest, payload)
  for (const key of ['no', 'numberYear', 'previousQuotationId', 'pdfDocument']) assert.equal(Object.hasOwn(payload, key), false)
})

async function loadService(name) {
  const source = (await readFile(new URL(`../src/services/${name}.js`, import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`))[name]
}

function operation(request) {
  const url = new URL(`/api/v1${request.path}`, 'http://localhost')
  const entry = Object.entries(swagger.paths).find(([path]) => new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(url.pathname))
  // Static paths take precedence over parameterized paths.
  const route = swagger.paths[url.pathname] || entry?.[1]
  const op = route?.[(request.method || 'GET').toLowerCase()]
  assert.ok(op, `Swagger must expose ${request.method || 'GET'} ${url.pathname}`)
  return op
}

function assertBody(schema, value) {
  schema = resolve(schema)
  for (const key of schema.required || []) assert.notEqual(value[key], undefined, `Missing ${key}`)
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) assert.ok(schema.properties[key], `Unexpected ${key}`)
  }
}

test('Marketing service methods use documented endpoints and HTTP methods', async () => {
  for (const name of ['companyService', 'companyStaffService', 'itemService', 'serviceService', 'contractService', 'quotationService']) {
    const service = await loadService(name)
    for (const [method, invoke] of Object.entries(service)) {
      let request
      if (method === 'importPrices') request = invoke(uuid, { companyId: uuid, version: 0, file: new Blob(['test']) })
      else if (/^(list|download)/.test(method)) request = invoke({})
      else if (/history$/i.test(method)) request = invoke(uuid, { page: 1, limit: 20 })
      else request = invoke(uuid, 0, '2026-09-11')
      operation(request)
    }
  }
})

test('Service deletion and contract termination send required concurrency and date fields', async () => {
  const service = await loadService('serviceService')
  const contracts = await loadService('contractService')
  for (const request of [service.remove(uuid, 0), contracts.remove(uuid, 3, '2026-09-11')]) {
    const body = JSON.parse(request.body)
    assertBody(operation(request).requestBody.content['application/json'].schema, body)
    assert.equal(typeof body.version, 'number')
  }
  assert.deepEqual(JSON.parse(contracts.remove(uuid, 3, '2026-09-11').body), { version: 3, terminatedAt: '2026-09-11' })
})

test('Item history endpoints send only documented pagination and use size IDs for prices', async () => {
  const service = await loadService('itemService')
  for (const [method, path] of [
    ['history', `/marketing/items/${uuid}/history`],
    ['sizeHistory', `/marketing/items/sizes/${uuid}/history`],
    ['priceHistory', `/marketing/items/sizes/${uuid}/price/history`],
  ]) {
    const request = service[method](uuid, { page: 2, limit: 50, search: 'ignored', sortBy: 'version' })
    const url = new URL(request.path, 'http://localhost')
    assert.equal(url.pathname, path)
    assert.deepEqual([...url.searchParams], [['page', '2'], ['limit', '50']])
    const query = operation(request).parameters.filter((parameter) => parameter.in === 'query')
    assert.deepEqual(query.map((parameter) => parameter.name).sort(), ['limit', 'page'])
    assert.equal(query.find((parameter) => parameter.name === 'page').schema.minimum, 1)
    assert.equal(query.find((parameter) => parameter.name === 'limit').schema.maximum, 100)
    assert.equal(service[method](uuid).path, `${path}?page=1&limit=20`)
  }
  const response = resolve(operation(service.priceHistory(uuid)).responses['200'].content['application/json'].schema)
  const data = resolve(response.properties.data)
  assert.equal(data.properties.history.type, 'array')
  assert.equal(data.properties.history.minItems || 0, 0)
  const pagination = resolve(data.properties.pagination)
  assert.ok(pagination.properties.total)
  assert.ok(pagination.properties.totalPages)
})

test('Item exclusions use Swagger comma-separated query format and omit empty arrays', async () => {
  const items = await loadService('itemService')
  assert.equal(new URL(items.listSizes({ notIn: [] }).path, 'http://localhost').searchParams.has('notIn'), false)
  assert.equal(new URL(items.listSizes({ notIn: [uuid, uuid] }).path, 'http://localhost').searchParams.get('notIn'), `${uuid},${uuid}`)
})

const record = { ...quotationFormValues(), companySnapshot: { id: uuid, name: 'Customer' }, staffId: uuid, inquiryDate: '2026-09-12',
  status: 'CREATED', invoiceStatus: null,
  ...Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, 'Test'])),
  items: [{ id: uuid, itemSizeId: uuid, quantityInspection: '1', quantityMaintenance: '2', priceInspection: '100.00', priceMaintenance: '150.00' }] }

test('Create quotation sends only allowed item fields and omits client prices and IDs', () => {
  const values = quotationFormValues(record)
  const payload = quotationPayload({ ...values, items: [{ ...values.items[0], priceSelection: { priceId: uuid } }] }, { create: true })
  assertBody(swagger.components.schemas.CreateQuotationRequest, payload)
  const line = payload.items[0]
  assertBody(swagger.components.schemas.QuotationItemInput, line)
  assert.deepEqual(line, { itemSizeId: uuid, quantityInspection: '1', quantityMaintenance: '2' })
  assert.equal(payload.companyId, uuid)
  const apiQuantityPattern = new RegExp(swagger.components.schemas.QuotationItemInput.properties.quantityInspection.oneOf[0].pattern)
  for (const value of ['0', '1', '999999999999', '1.5', '0.001', '999999999999.999']) {
    assert.ok(QUANTITY_PATTERN.test(value))
    assert.ok(apiQuantityPattern.test(value))
  }
  for (const value of ['-1', '0.0001', '1000000000000', '1e3', '1.']) {
    assert.equal(QUANTITY_PATTERN.test(value), false)
    assert.equal(apiQuantityPattern.test(value), false)
  }
})

test('Quotation activity filters preserve false and omit an unselected filter', async () => {
  const service = await loadService('quotationService')
  for (const isActive of [true, false, 'true', 'false', undefined, '']) {
    const request = service.list({ page: 2, limit: 50, isActive })
    const params = new URL(request.path, 'http://localhost').searchParams
    assert.equal(params.get('page'), '2')
    assert.equal(params.get('limit'), '50')
    assert.equal(params.get('isActive'), isActive === undefined || isActive === '' ? null : String(isActive))
    assert.deepEqual(operation(request).parameters.find((parameter) => parameter.name === 'isActive').schema.enum, ['true', 'false'])
  }
})

test('Standalone quotation items preserve null size without sending display labels', () => {
  const values = quotationFormValues({ ...record, items: [{ ...record.items[0], itemName: 'Inspection', serviceName: null, size: null }] })
  assert.equal(values.items[0].catalogLabel, 'Without size - Inspection / Standalone')
  assert.equal(values.items[0].size, null)
  assert.equal(Object.hasOwn(quotationPayload(values).items[0], 'catalogLabel'), false)
})

test('Quotation date is server-managed and never enters create or update requests', async () => {
  const service = await loadService('quotationService')
  const saved = { ...record, date: '2026-09-12T00:00:00.000Z' }
  const values = { ...quotationFormValues(saved), date: '2026-10-01', subject: 'Updated subject' }
  const requests = [
    service.create(quotationPayload(values, { create: true })),
    service.update(uuid, { ...quotationChanges(values, saved), version: 0 }),
  ]
  for (const request of requests) {
    const body = JSON.parse(request.body)
    const schema = resolve(operation(request).requestBody.content['application/json'].schema)
    assert.equal(Object.hasOwn(schema.properties, 'date'), false)
    assertBody(schema, body)
    assert.equal(Object.hasOwn(body, 'date'), false)
    assert.equal(body.inquiryDate, request.method === 'POST' ? '2026-09-12' : undefined)
  }
  assert.deepEqual(quotationChanges({ ...quotationFormValues(saved), date: '2026-10-01' }, saved), {})
  for (const values of [quotationFormValues(), quotationFormValues(saved)]) assert.equal(Object.hasOwn(values, 'date'), false)
  assert.equal(swagger.components.schemas.Quotation.properties.date.readOnly, true)
})

test('Branch tax snapshots are read-only and never enter create or update payloads', () => {
  const saved = { ...record, tax: '11.25', taxSourceId: uuid }
  const values = { ...quotationFormValues(saved), tax: 12, taxSourceId: uuid }
  const payload = quotationPayload(values, { create: true })
  assertBody(swagger.components.schemas.CreateQuotationRequest, payload)
  for (const key of ['tax', 'taxSourceId']) {
    assert.equal(Object.hasOwn(payload, key), false)
    assert.equal(Object.hasOwn(quotationFormValues(saved), key), false)
    assert.equal(Object.hasOwn(swagger.components.schemas.UpdateQuotationRequest.properties, key), false)
  }
  assert.deepEqual(quotationChanges(values, saved), {})
  assert.equal(swagger.components.schemas.Quotation.properties.tax.readOnly, true)
})

test('Quantity-only updates retain line IDs and both quantities without sending saved prices or tokens', () => {
  const values = quotationFormValues(record)
  assert.deepEqual(quotationChanges(values, record), {})
  values.items[0].quantityInspection = '2.500'
  const changes = quotationChanges(values, record)
  assert.deepEqual(changes.items[0], { id: uuid, itemSizeId: uuid, quantityInspection: '2.5', quantityMaintenance: '2' })
  assertBody(swagger.components.schemas.UpdateQuotationItemInput, changes.items[0])
})

test('Create and update omit server-managed statuses even when supplied in form values', async () => {
  const service = await loadService('quotationService')
  const values = { ...quotationFormValues(record), subject: 'Updated subject', status: 'APPROVED', invoiceStatus: 'COMPLETE' }
  const requests = [
    service.create(quotationPayload(values, { create: true })),
    service.update(uuid, { ...quotationChanges(values, record), version: 0 }),
  ]
  for (const request of requests) {
    const body = JSON.parse(request.body)
    assertBody(operation(request).requestBody.content['application/json'].schema, body)
    assert.equal(Object.hasOwn(body, 'status'), false)
    assert.equal(Object.hasOwn(body, 'invoiceStatus'), false)
  }
  assert.deepEqual(quotationChanges({ ...quotationFormValues(record), status: 'APPROVED', invoiceStatus: 'COMPLETE' }, record), {})
  for (const values of [quotationFormValues(), quotationFormValues(record)]) {
    assert.equal(Object.hasOwn(values, 'status'), false)
    assert.equal(Object.hasOwn(values, 'invoiceStatus'), false)
  }
})

test('Customer changes include the complete active item list even when lines are unchanged', () => {
  const values = quotationFormValues(record)
  values.staffId = '00000000-0000-4000-8000-000000000002'
  const changes = quotationChanges(values, record)
  assert.equal(changes.staffId, values.staffId)
  assert.equal(changes.items.length, 1)
  assert.equal(changes.items[0].id, uuid)
  assertBody(swagger.components.schemas.UpdateQuotationItemInput, changes.items[0])
})

test('Quotation options use standard or sister-company rates and reject contract or inactive catalog options', () => {
  const option = { id: uuid, itemId: uuid, size: '2', item: { name: 'Pipe', service: { name: 'Inspection' } },
    catalogSnapshot: { itemName: 'Contract Pipe', serviceName: 'Contract Inspection', size: '3', serviceType: 'INSPECTION', hasMaintenance: false },
    catalogActive: true, priceSource: 'PRIMARY', priceStatus: 'AVAILABLE', priceService: '0.00', priceMaintenance: null,
    priceId: null, priceVersion: null, contractId: uuid, contractVersion: 0, sizeVersion: 0, itemVersion: 0, serviceVersion: 0 }
  assertBody(swagger.components.schemas.QuotationSizeOption, option)
  const selected = quotationOptionValues(option)
  assert.equal(selected.itemSizeId, uuid)
  assert.equal(selected.priceInspection, '0.00')
  assert.equal(selected.itemName, 'Contract Pipe')
  assert.equal(selected.size, '3')
  assert.equal(quotationOptionValues({ ...option, catalogSnapshot: null }).itemName, 'Pipe')
  assert.equal(quotationOptionValues({ ...option, priceStatus: 'UNAVAILABLE' }), null)
  assert.deepEqual(swagger.components.schemas.QuotationSizeOption.properties.priceSource.enum, ['PRIMARY', 'SISTER_COMPANY'])
  assert.equal(quotationOptionValues({ ...option, priceSource: 'CONTRACT' }), null)
  assert.equal(quotationOptionValues({ ...option, catalogActive: false }), null)
  assert.equal(quotationOptionValues({ ...option, priceSource: 'SISTER_COMPANY' }).priceInspection, '0.00')
  assert.equal(quotationOptionValues({ ...option, priceService: null }), null)
  const line = quotationPayload({ ...record, items: [selected] }, { create: true }).items[0]
  assertBody(swagger.components.schemas.QuotationItemInput, line)
  assert.deepEqual(line, { itemSizeId: uuid, quantityInspection: '1', quantityMaintenance: '0' })
})

test('Company-only creation supports maintenance-only lines and strips legacy fields', () => {
  const payload = quotationPayload({ ...record, staffId: undefined, items: [{ itemSizeId: uuid,
    quantityInspection: '0', quantityMaintenance: '2.500', quantity: '5', priceKind: 'MAINTENANCE', priceInspection: '100' }] }, { create: true })
  assertBody(swagger.components.schemas.CreateQuotationRequest, payload)
  assert.equal(payload.companyId, uuid)
  assert.equal(payload.staffId, null)
  assert.deepEqual(payload.items[0], { itemSizeId: uuid, quantityInspection: '0', quantityMaintenance: '2.5' })
  assertBody(swagger.components.schemas.QuotationItemInput, payload.items[0])
})

test('Company replacement reprices all lines and clearing a contact sends null', () => {
  const values = quotationFormValues(record)
  values.companyId = '00000000-0000-4000-8000-000000000002'
  values.staffId = undefined
  const changes = quotationChanges(values, record)
  assert.equal(changes.companyId, values.companyId)
  assert.equal(changes.staffId, null)
  assert.equal(changes.items.length, 1)
  assertBody(swagger.components.schemas.UpdateQuotationRequest, { ...changes, version: 0 })
})

test('Quotation options send documented exclude and server pagination parameters', async () => {
  const service = await loadService('itemService')
  const request = service.listPrices({ companyId: uuid, exclude: [uuid], page: 2, limit: 20 })
  const op = operation(request)
  const query = new URL(request.path, 'http://localhost').searchParams
  for (const key of query.keys()) assert.ok(op.parameters.some((parameter) => parameter.in === 'query' && parameter.name === key))
  assert.equal(query.get('exclude'), uuid)
  assert.equal(query.get('page'), '2')
  assert.equal(new URL(service.listPrices({ companyId: uuid, exclude: [] }).path, 'http://localhost').searchParams.has('exclude'), false)
})
