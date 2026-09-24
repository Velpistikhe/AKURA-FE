import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { contractPricePayload } from '../src/modules/company/contractPriceModel.js'
import { createItemPayload } from '../src/modules/item/itemModel.js'
import { canApproveQuotation, canUpdateQuotation, quotationNumber, quotationChanges, quotationFormValues, quotationPayload, quotationOptionValues, quotationTextMaxLength, TEXT_FIELDS, QUANTITY_PATTERN } from '../src/modules/quotation/quotationModel.js'

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

test('Single contract price POST and PATCH match Swagger and preserve exact prices and price version', async () => {
  const service = await loadService('contractService')
  const values = { priceService: '9999999999999999.99', priceMaintenance: '0' }
  for (const request of [service.createPrice(uuid, contractPricePayload(values, { contractId: uuid })),
    service.updatePrice(uuid, contractPricePayload(values, { version: 9 }))]) {
    const body = JSON.parse(request.body)
    assertBody(operation(request).requestBody.content['application/json'].schema, body)
    for (const status of ['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED']) assert.ok(operation(request).description.includes(status))
    assert.match(operation(request).description, /SUBMITTED and APPROVED require ADMIN with MARKETING section/)
    assert.equal(body.priceService, values.priceService)
    assert.equal(body.priceMaintenance, '0')
    assert.equal(body.companyId, undefined)
    if (request.method === 'PATCH') { assert.equal(body.version, 9); assert.equal(body.contractId, undefined) }
    else { assert.equal(body.contractId, uuid); assert.equal(body.version, undefined) }
  }
})

test('Contract price DELETE sends the price row version to the Swagger endpoint', async () => {
  const service = await loadService('contractService')
  const request = service.removePrice(uuid, 7)
  assert.equal(request.path, `/marketing/items/contract-prices/${uuid}`)
  assert.equal(request.method, 'DELETE')
  const body = JSON.parse(request.body)
  assert.deepEqual(body, { version: 7 })
  assertBody(operation(request).requestBody.content['application/json'].schema, body)
  assert.match(operation(request).description, /Soft deletion/)
})

test('Contract price options use the viewed contract, server pagination, and flat Swagger fields', async () => {
  const service = await loadService('itemService')
  const request = service.listContractPriceOptions(uuid, { page: 2, limit: 10, itemName: 'Pipe', serviceName: 'Inspection', size: '' })
  const url = new URL(request.path, 'http://localhost')
  assert.equal(url.pathname, `/marketing/items/sizes/contract-price-options/${uuid}`)
  assert.equal(url.searchParams.has('contractId'), false)
  assert.ok(operation(request).parameters.some((parameter) => parameter.name === 'contractId' && parameter.in === 'path' && parameter.required))
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('limit'), '10')
  assert.equal(url.searchParams.get('itemName'), 'Pipe')
  assert.equal(url.searchParams.get('serviceName'), 'Inspection')
  assert.equal(url.searchParams.has('size'), false)
  assert.equal(url.searchParams.has('notIn'), false)
  for (const key of url.searchParams.keys()) assert.ok(operation(request).parameters.some((parameter) => parameter.name === key))
  const option = { id: uuid, itemId: uuid, version: 0, size: null, itemName: 'Pipe', serviceName: null }
  assertBody(swagger.components.schemas.ContractPriceOption, option)
  assert.equal(swagger.components.schemas.ContractPriceOption.properties.item, undefined)
})

test('Contract list is company-scoped and Excel upload sends only documented multipart fields', async () => {
  const service = await loadService('contractService')
  const request = service.listPrices({ companyId: uuid, contractId: uuid, page: 2, limit: 20, isActive: 'true' })
  const params = new URL(request.path, 'http://localhost').searchParams
  assert.equal(params.get('companyId'), uuid)
  for (const key of params.keys()) assert.ok(operation(request).parameters.some((parameter) => parameter.name === key))
  const upload = service.importPrices(uuid, { companyId: uuid, version: 12, file: new Blob(['test']) })
  const body = Object.fromEntries(upload.body)
  assertBody(operation(upload).requestBody.content['multipart/form-data'].schema, body)
  assert.deepEqual(Object.keys(body).sort(), ['companyId', 'file', 'version'])
  assert.equal(body.version, '12')
  assert.equal(upload.headers, undefined, 'Browser must supply multipart boundary')
  assert.equal(upload.path, `/marketing/company-contracts/${uuid}/prices/import`, 'Upload must address the selected contract')
  assert.match(operation(upload).description, /DRAFT contracts are supported and remain DRAFT/)
})

test('Contract price history uses the price row ID and server pagination', async () => {
  const service = await loadService('contractService')
  const request = service.priceHistory(uuid, { page: 2, limit: 10 })
  const url = new URL(request.path, 'http://localhost')
  assert.equal(url.pathname, `/marketing/company-contract-prices/${uuid}/history`)
  assert.equal(request.method || 'GET', 'GET')
  assert.equal(request.body, undefined)
  assert.deepEqual([...url.searchParams], [['page', '2'], ['limit', '10']])
  const op = operation(request)
  assert.ok(op.parameters.some(p => p.in === 'path' && p.name === 'contractPriceId'))
  for (const key of url.searchParams.keys()) assert.ok(op.parameters.some(p => p.in === 'query' && p.name === key))
  assert.equal(new URL(service.priceHistory(uuid).path, 'http://localhost').searchParams.get('limit'), '20')
})

test('Marketing service methods use documented endpoints and HTTP methods', async () => {
  for (const name of ['companyService', 'companyStaffService', 'itemService', 'serviceService', 'contractService', 'quotationService']) {
    const service = await loadService(name)
    for (const [method, invoke] of Object.entries(service)) {
      let request
      if (method === 'importPrices') request = invoke(uuid, { companyId: uuid, version: 0, file: new Blob(['test']) })
      else if (method === 'listContractPriceOptions') request = invoke(uuid, {})
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
  for (const request of [service.remove(uuid, 0), contracts.terminate(uuid, 3, '2026-09-11')]) {
    const body = JSON.parse(request.body)
    assertBody(operation(request).requestBody.content['application/json'].schema, body)
    assert.equal(typeof body.version, 'number')
  }
  assert.deepEqual(JSON.parse(contracts.terminate(uuid, 3, '2026-09-11').body), { version: 3, terminatedAt: '2026-09-11' })
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

test('Delivery invoice is required text and preserves trimmed values on create and edit', () => {
  assert.ok(swagger.components.schemas.CreateQuotationRequest.required.includes('deliveryInvoice'))
  assert.ok(TEXT_FIELDS.some(([key]) => key === 'deliveryInvoice'))
  for (const name of ['CreateQuotationRequest', 'UpdateQuotationRequest', 'Quotation']) {
    const schema = swagger.components.schemas[name]
    assert.equal(schema.properties.deliveryInvoice.maxLength, 255)
    assert.ok(!schema.properties.deliveryInvoice.nullable)
  }
  for (const deliveryInvoice of [undefined, null, '', '   ']) {
    const values = quotationFormValues({ ...record, deliveryInvoice })
    assert.equal(values.deliveryInvoice, '')
  }
  const original = { ...record, deliveryInvoice: 'Email to billing contact' }
  const values = quotationFormValues(original)
  assert.equal(values.deliveryInvoice, original.deliveryInvoice)
  assert.deepEqual(quotationChanges(values, original), {})
  assert.deepEqual(quotationChanges({ ...values, deliveryInvoice: '  Send original invoice  ' }, original), { deliveryInvoice: 'Send original invoice' })
  const changes = quotationChanges({ ...values, deliveryInvoice: 'Courier' }, original)
  assert.deepEqual(changes, { deliveryInvoice: 'Courier' })
  assertBody(swagger.components.schemas.UpdateQuotationRequest, { ...changes, version: 0 })
  assert.equal(quotationPayload({ ...record, deliveryInvoice: '  Email invoice  ' }, { create: true }).deliveryInvoice, 'Email invoice')
})

test('Job start is required free text and survives create and header-only updates without date truncation', async () => {
  assert.ok(swagger.components.schemas.CreateQuotationRequest.required.includes('jobStart'))
  for (const name of ['CreateQuotationRequest', 'UpdateQuotationRequest', 'Quotation']) {
    const schema = swagger.components.schemas[name].properties.jobStart
    assert.equal(schema.type, 'string')
    assert.equal(schema.format, undefined)
    assert.equal(schema.minLength, 1)
    assert.equal(schema.maxLength, quotationTextMaxLength('jobStart'))
    assert.ok(!schema.nullable)
  }
  const api = await loadService('quotationService')
  const jobStart = 'Within 7 days after purchase order approval'
  const original = { ...record, jobStart }
  const values = quotationFormValues(original)
  assert.equal(values.jobStart, jobStart)
  assert.deepEqual(quotationChanges(values, original), {})
  const create = api.create(quotationPayload({ ...values, jobStart: `  ${jobStart}  ` }, { create: true }))
  const body = JSON.parse(create.body)
  assertBody(operation(create).requestBody.content['application/json'].schema, body)
  assert.equal(body.jobStart, jobStart)
  const changes = quotationChanges({ ...values, jobStart: '  After confirmation  ' }, original)
  assert.deepEqual(changes, { jobStart: 'After confirmation' })
  const update = api.update(uuid, { ...changes, version: 2 })
  assertBody(operation(update).requestBody.content['application/json'].schema, JSON.parse(update.body))
})

test('Supply fields preserve multiline text up to the documented 5000 character limit', () => {
  for (const key of ['supplyAkura', 'supplyCustomer']) {
    for (const name of ['CreateQuotationRequest', 'UpdateQuotationRequest', 'Quotation']) {
      assert.equal(swagger.components.schemas[name].properties[key].maxLength, quotationTextMaxLength(key))
    }
    const text = `First line\n${'x'.repeat(4989)}`
    assert.equal(text.length, 5000)
    assert.equal(quotationPayload({ ...record, [key]: text }, { create: true })[key], text)
    assert.deepEqual(quotationChanges({ ...quotationFormValues(record), [key]: text }, record), { [key]: text })
  }
})

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

test('Item notes follow Swagger on creation and remain immutable during header updates', () => {
  for (const name of ['QuotationItemInput', 'QuotationItem']) {
    assert.equal(swagger.components.schemas[name].properties.note.maxLength, 5000)
    assert.equal(swagger.components.schemas[name].properties.note.nullable, true)
  }
  const note = 'Inspect welds first.\nReport findings separately.'
  const original = { ...record, items: [{ ...record.items[0], note }] }
  const values = quotationFormValues(original)
  assert.equal(values.items[0].note, note)
  assert.deepEqual(quotationChanges(values, original), {})
  const payload = quotationPayload(original, { create: true })
  assert.equal(payload.items[0].note, note)
  assertBody(swagger.components.schemas.QuotationItemInput, payload.items[0])
  for (const nextNote of ['Updated note', 'x'.repeat(5000), '', null]) {
    const changed = quotationChanges({ ...values, items: [{ ...values.items[0], note: nextNote }] }, original)
    assert.deepEqual(changed, {})
  }
  assert.equal(Object.hasOwn(quotationPayload(quotationFormValues(record), { create: true }).items[0], 'note'), false)
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

test('Quantity changes cannot enter quotation header updates', () => {
  const values = quotationFormValues(record)
  assert.deepEqual(quotationChanges(values, record), {})
  values.items[0].quantityInspection = '2.500'
  const changes = quotationChanges(values, record)
  assert.deepEqual(changes, {})
  assert.equal(swagger.components.schemas.UpdateQuotationRequest.properties.items, undefined)
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

test('Customer changes send only the new contact without repricing items', () => {
  const values = quotationFormValues(record)
  values.staffId = '00000000-0000-4000-8000-000000000002'
  const changes = quotationChanges(values, record)
  assert.equal(changes.staffId, values.staffId)
  assert.deepEqual(changes, { staffId: values.staffId })
  assertBody(swagger.components.schemas.UpdateQuotationRequest, { ...changes, version: 0 })
})

test('Quotation options accept contract, standard and sister-company rates and reject unavailable options', () => {
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
  assert.deepEqual(swagger.components.schemas.QuotationSizeOption.properties.priceSource.enum, ['PRIMARY', 'SISTER_COMPANY', 'CONTRACT'])
  const contractOption = quotationOptionValues({ ...option, priceSource: 'CONTRACT' })
  assert.equal(contractOption.priceInspection, '0.00')
  assert.deepEqual(quotationPayload({ ...record, items: [contractOption] }, { create: true }).items[0], { itemSizeId: uuid, quantityInspection: '1', quantityMaintenance: '0' })
  assert.equal(quotationOptionValues({ ...option, priceSource: 'CONTRACT', priceStatus: 'UNAVAILABLE' }), null)
  assert.equal(quotationOptionValues({ ...option, catalogActive: false }), null)
  assert.equal(quotationOptionValues({ ...option, priceSource: 'SISTER_COMPANY' }).priceInspection, '0.00')
  assert.equal(quotationOptionValues({ ...option, priceService: null }), null)
  const line = quotationPayload({ ...record, items: [selected] }, { create: true }).items[0]
  assertBody(swagger.components.schemas.QuotationItemInput, line)
  assert.deepEqual(line, { itemSizeId: uuid, quantityInspection: '1', quantityMaintenance: '0' })
})

test('Creation with a required contact supports maintenance-only lines and strips legacy fields', () => {
  assert.ok(swagger.components.schemas.CreateQuotationRequest.required.includes('staffId'))
  assert.equal(swagger.components.schemas.CreateQuotationRequest.properties.staffId.nullable, false)
  const payload = quotationPayload({ ...record, items: [{ itemSizeId: uuid,
    quantityInspection: '0', quantityMaintenance: '2.500', quantity: '5', priceKind: 'MAINTENANCE', priceInspection: '100' }] }, { create: true })
  assertBody(swagger.components.schemas.CreateQuotationRequest, payload)
  assert.equal(payload.companyId, uuid)
  assert.equal(payload.staffId, uuid)
  assert.deepEqual(payload.items[0], { itemSizeId: uuid, quantityInspection: '0', quantityMaintenance: '2.5' })
  assertBody(swagger.components.schemas.QuotationItemInput, payload.items[0])
})

test('Quotation updates omit immutable company and items even if supplied', () => {
  const values = quotationFormValues(record)
  values.companyId = '00000000-0000-4000-8000-000000000002'
  values.staffId = '00000000-0000-4000-8000-000000000003'
  const changes = quotationChanges(values, record)
  assert.equal(Object.hasOwn(changes, 'companyId'), false)
  assert.equal(swagger.components.schemas.UpdateQuotationRequest.properties.companyId.readOnly, true)
  assert.equal(changes.staffId, values.staffId)
  assert.equal(swagger.components.schemas.UpdateQuotationRequest.properties.staffId.nullable, false)
  assert.equal(Object.hasOwn(changes, 'items'), false)
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


test('Contract lifecycle uses Swagger statuses, draft PATCH, revision POST and termination POST', async () => {
  const service = await loadService('contractService')
  const fields = { version: 3, contractNumber: 'CON-002', contractDate: '2026-09-20', effectiveFrom: '2026-10-01', effectiveUntil: '2027-10-01' }
  for (const [request, method, schemaName] of [
    [service.update(uuid, fields), 'PATCH', 'UpdateCompanyContractRequest'],
    [service.revise(uuid, fields), 'POST', 'ReviseCompanyContractRequest'],
    [service.terminate(uuid, 3, '2026-10-01'), 'POST', 'TerminateCompanyContractRequest'],
    [service.approve(uuid, 3), 'POST', 'CatalogVersionRequest'],
    [service.submit(uuid, 3), 'POST', 'CatalogVersionRequest'],
    [service.reject(uuid, 3), 'POST', 'CatalogVersionRequest'],
    [service.cancel(uuid, 3), 'DELETE', 'CatalogVersionRequest'],
  ]) {
    assert.equal(request.method, method)
    const schema = operation(request).requestBody.content['application/json'].schema
    assert.equal(schema.$ref, `#/components/schemas/${schemaName}`)
    assertBody(schema, JSON.parse(request.body))
  }
  assert.equal(service.terminate(uuid, 3, '2026-10-01').path, `/marketing/company-contracts/${uuid}/terminate`)
  for (const action of ['approve', 'submit', 'reject']) {
    assert.equal(service[action](uuid, 3).path, `/marketing/company-contracts/${uuid}/${action}`)
    assert.deepEqual(JSON.parse(service[action](uuid, 3).body), { version: 3 })
  }
  const statuses = ['DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'TERMINATED', 'REVISED']
  assert.deepEqual(swagger.components.schemas.CompanyContract.properties.status.enum, statuses)
  assert.equal(swagger.components.schemas.CompanyContract.properties.isActive, undefined)
  for (const status of statuses) {
    const request = service.list({ companyId: uuid, status, page: 1, limit: 20 })
    const parameters = operation(request).parameters
    for (const key of new URL(request.path, 'http://localhost').searchParams.keys()) {
      assert.ok(parameters.some((parameter) => parameter.name === key))
    }
    assert.ok(parameters.find((parameter) => parameter.name === 'status').schema.enum.includes(status))
  }
})


test('Only active CREATED quotations allow header updates', () => {
  for (const status of ['CREATED', 'SENT', 'REVISED', 'APPROVED', 'CANCELLED', undefined]) {
    for (const isActive of [true, false, undefined]) {
      assert.equal(canUpdateQuotation({ status, isActive }), status === 'CREATED' && isActive === true)
    }
  }
  assert.equal(canUpdateQuotation(null), false)
  assert.equal(canUpdateQuotation(), false)
})

test('Every editable quotation header field matches the live Swagger PATCH contract', async () => {
  const service = await loadService('quotationService')
  const values = { ...quotationFormValues(record), ...Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, 'Updated ' + key])),
    inquiryMethod: 'VERBAL', inquiryDate: '2026-09-24', staffId: '00000000-0000-4000-8000-000000000002',
    companyId: '00000000-0000-4000-8000-000000000003', items: [] }
  const changes = quotationChanges(values, record)
  const request = service.update(uuid, { ...changes, version: 2 })
  const schema = resolve(operation(request).requestBody.content['application/json'].schema)
  assertBody(schema, JSON.parse(request.body))
  assert.equal(request.method, 'PATCH')
  assert.equal(Object.keys(changes).length, TEXT_FIELDS.length + 3)
  assert.equal(Object.hasOwn(changes, 'companyId'), false)
  assert.equal(Object.hasOwn(changes, 'items'), false)
})
