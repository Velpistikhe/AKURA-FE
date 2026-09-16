import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const response = await fetch(process.env.SWAGGER_URL || 'http://localhost:5000/api-docs.json')
assert.equal(response.status, 200)
const swagger = await response.json()
const id = '00000000-0000-4000-8000-000000000001'
const resolve = (schema) => schema?.$ref ? resolve(swagger.components.schemas[schema.$ref.split('/').pop()]) : schema
function validate(schema, value, path = 'body') {
  schema = resolve(schema)
  if (value === null && schema.nullable) return
  for (const entry of schema.allOf || []) validate(entry, value, path)
  const variants = schema.oneOf || schema.anyOf
  if (variants) {
    const matches = variants.filter((entry) => { try { validate(entry, value, path); return true } catch { return false } })
    assert.ok(schema.oneOf ? matches.length === 1 : matches.length > 0, `${path}: no matching variant`)
  }
  if (schema.enum) assert.ok(schema.enum.includes(value), `${path}: invalid enum ${value}`)
  if (schema.type === 'object' || schema.properties) {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), path)
    for (const key of schema.required || []) assert.notEqual(value[key], undefined, `${path}.${key} required`)
    if (schema.minProperties) assert.ok(Object.keys(value).length >= schema.minProperties, path)
    for (const [key, entry] of Object.entries(value)) {
      if (schema.additionalProperties === false) assert.ok(schema.properties?.[key], `${path}.${key} not allowed`)
      if (schema.properties?.[key]) validate(schema.properties[key], entry, `${path}.${key}`)
    }
  }
  if (schema.type === 'string') {
    assert.equal(typeof value, 'string', path)
    if (schema.minLength) assert.ok(value.length >= schema.minLength, path)
    if (schema.maxLength) assert.ok(value.length <= schema.maxLength, path)
    if (schema.pattern) assert.match(value, new RegExp(schema.pattern), path)
    if (schema.format === 'date') assert.match(value, /^\d{4}-\d{2}-\d{2}$/, path)
    if (schema.format === 'uuid') assert.match(value, /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i, path)
  }
  if (['integer', 'number'].includes(schema.type)) {
    assert.equal(typeof value, 'number', path)
    if (schema.type === 'integer') assert.ok(Number.isInteger(value), path)
    if (schema.minimum != null) assert.ok(value >= schema.minimum, path)
    if (schema.maximum != null) assert.ok(value <= schema.maximum, path)
  }
  if (schema.type === 'boolean') assert.equal(typeof value, 'boolean', path)
  if (schema.type === 'array') {
    assert.ok(Array.isArray(value), path)
    if (schema.minItems) assert.ok(value.length >= schema.minItems, path)
    if (schema.maxItems) assert.ok(value.length <= schema.maxItems, path)
    value.forEach((entry) => validate(schema.items, entry, path))
  }
}

function check(request) {
  const url = new URL(`/api/v1${request.path}`, 'http://localhost')
  const match = swagger.paths[url.pathname] || Object.entries(swagger.paths).find(([path]) => new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(url.pathname))?.[1]
  const operation = match?.[(request.method || 'GET').toLowerCase()]
  assert.ok(operation, `${request.method || 'GET'} ${url.pathname}`)
  for (const [key, value] of url.searchParams) {
    const parameter = operation.parameters.find((entry) => entry.in === 'query' && entry.name === key)
    assert.ok(parameter, `${url.pathname}: unexpected query ${key}`)
    const schema = resolve(parameter.schema)
    if (schema.type === 'boolean') assert.ok(['true', 'false'].includes(value), `${key}: boolean query`)
    validate(schema, ['number', 'integer'].includes(schema.type) ? Number(value) : schema.type === 'boolean' ? value === 'true' : schema.type === 'array' ? value.split(',') : value, key)
  }
  for (const parameter of operation.parameters || []) if (parameter.in === 'query' && parameter.required) assert.ok(url.searchParams.has(parameter.name))
  if (request.body !== undefined) {
    assert.ok(operation.requestBody, `${url.pathname}: body is not documented`)
    validate(operation.requestBody.content['application/json'].schema, JSON.parse(request.body))
  }
  else assert.ok(!operation.requestBody?.required, `${url.pathname}: missing body`)
  return operation
}

async function service(app, name) {
  const source = (await readFile(new URL(`../${app}/src/services/${name}.js`, import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`))[name]
}

test('Marketing work order requests follow the live Field Service Swagger', async () => {
  const api = await service('akura-marketing', 'workOrderService')
  const { workOrderPayload } = await import('../akura-marketing/src/modules/work-order/workOrderModel.js')
  check(api.list({ page: 2, limit: 20, status: 'DRAFT', revoked: false, search: 'inspection' }))
  check(api.get(id))
  const values = { basis: 'company', companyId: id, startDate: '2026-09-16', status: 'DRAFT', summary: 'Inspection', inspectors: ['Budi'] }
  check(api.create(workOrderPayload(values)))
  check(api.create(workOrderPayload({ ...values, basis: 'quotation', quotationId: id }, { id, version: 3, status: 'APPROVED', isActive: true, items: [] })))
})

test('Field Service read requests follow the live Swagger', async () => {
  const api = await service('akura-fieldservice', 'workOrderService')
  check(api.list({ page: 2, limit: 20, status: 'COMPLETED', revoked: false, search: 'inspection' }))
  check(api.get(id))
  assert.deepEqual(Object.keys(api).sort(), ['get', 'list'])
})

for (const app of ['akura-app-manager', 'akura-marketing', 'akura-finance', 'akura-fieldservice']) test(`${app}: expired sessions refresh through cookies and retry the original request`, async () => {
  let source = await readFile(new URL(`../${app}/src/services/api.js`, import.meta.url), 'utf8')
  source = source.replaceAll('import.meta.env.VITE_API_BASE_URL', 'undefined').replaceAll('import.meta.env.VITE_AKURA_SHELL_URL', 'undefined')
  source = `// ${app}
    const calls = []; let retried = false;
    const fetch = async (url, options) => {
      calls.push({ path: new URL(url).pathname.replace('/api/v1', ''), ...options });
      if (url.endsWith('/auth/refresh-token')) { retried = true; return { ok: true, status: 200, json: async () => ({ success: true }) } }
      return { ok: retried, status: retried ? 200 : 401, json: async () => ({ success: retried, data: [] }) };
    };
    export { calls };
    ${source}`
  const { apiRequest, calls } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  const result = await apiRequest('/app-manager/menus/my-menus')
  assert.equal(result.success, true)
  assert.equal(calls.length, 3)
  assert.equal(calls[1].body, undefined)
  assert.equal(calls[1].credentials, 'include')
  assert.equal(calls[1].path, '/auth/refresh-token')
  assert.equal(calls[2].path, calls[0].path)
  check(calls[1])
})

const managerCases = [
  ['userService', { role: 'ADMIN', section: 'FINANCE', officeBranchId: id, isActive: true, version: 1 }, { role: 'ADMIN', section: 'FINANCE', isActive: 'true', search: 'test', sortBy: 'section', sortOrder: 'asc' }],
  ['menuService', { key: 'referensi', label: 'References', hasItem: true, order: 1, items: [{ key: 'taxes', label: 'Tax', order: 1 }] }, { hasItem: 'true', isActive: 'true', search: 'test', sortBy: 'key', sortOrder: 'asc' }],
  ['menuItemService', { menuId: id, key: 'taxes', label: 'Tax', order: 1 }, { menuId: id, isActive: 'true', search: 'test', sortBy: 'key', sortOrder: 'asc' }],
  ['menuAccessService', { menuItemId: id, role: null, section: 'FINANCE' }, { menuItemId: id, role: 'ADMIN', section: 'FINANCE', sortBy: 'section', sortOrder: 'asc' }],
  ['officeBranchService', { name: 'Branch', address: 'Jakarta', telp: '021123456', email: 'branch@example.com', isHead: true }, { isHead: 'true', search: 'test', sortBy: 'name', sortOrder: 'asc' }],
]
for (const [name, payload, query] of managerCases) test(`App Manager ${name}: requests, filters and payloads match Swagger`, async () => {
  const api = await service('akura-app-manager', name)
  check(api.list({ page: 1, limit: 20, ...query }))
  check(api.get(id))
  if (api.create) check(api.create(payload))
  const { items, ...update } = payload
  check(api.update(id, update))
  if (api.remove) check(api.remove(id))
  if (api.options) check(api.options())
})

test('Shell authentication and navigation requests match Swagger', async () => {
  let source = await readFile(new URL('../akura-shell/src/services/api.js', import.meta.url), 'utf8')
  source = source.replace("import axios from 'axios'", `const axios = { create: () => Object.assign(() => {}, {
    interceptors: { response: { use() {} } },
    get: (path) => Promise.resolve({ path, method: 'GET' }),
    post: (path, data) => Promise.resolve({ path, method: 'POST', body: JSON.stringify(data) }),
    put: (path, data) => Promise.resolve({ path, method: 'PUT', body: JSON.stringify(data) }),
  }) }`)
    .replace("import { clearRefreshToken, setRefreshToken } from './tokenStore'", "const clearRefreshToken = () => {}; const setRefreshToken = () => {}")
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined')
  const { authAPI } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  const credentials = { username: 'audituser', password: 'SecurePass123!', passwordConfirmation: 'SecurePass123!', firstName: 'Audit', lastName: 'User' }
  for (const request of await Promise.all([
    authAPI.login(credentials), authAPI.register(credentials), authAPI.me(), authAPI.logout(), authAPI.refreshToken(),
    authAPI.updateProfile(credentials), authAPI.changePassword({ oldPassword: 'OldPass123!', newPassword: 'SecurePass123!', newPasswordConfirmation: 'SecurePass123!' }),
  ])) check(request)
  const menuSource = (await readFile(new URL('../akura-shell/src/services/menuApi.js', import.meta.url), 'utf8')).replace("import api from './api'", "const api = { get: (path) => ({ path, method: 'GET' }) }")
  const { menuAPI } = await import(`data:text/javascript;base64,${Buffer.from(menuSource).toString('base64')}`)
  const operation = check(menuAPI.myMenus())
  const envelope = resolve(operation.responses['200'].content['application/json'].schema)
  assert.equal(envelope.properties.data.type, 'array')
})

test('Marketing contract lifecycle, prices, company and staff requests match Swagger', async () => {
  const services = await service('akura-marketing', 'serviceService')
  check(services.create({ name: 'Inspection', type: 'TUBULAR', hasMaintenance: true, inspectionScopes: ['Visual'], maintenanceScopes: ['Repair'] }))
  check(services.update(id, { name: 'Inspection', type: 'OCTG', hasMaintenance: false, version: 0 }))
  check(services.list({ name: 'Inspection', type: 'TUBULAR', isActive: 'true', sortBy: 'name', sortOrder: 'asc', page: 1, limit: 20 }))
  check(services.createInspectionScope(id, { inspectionScope: 'Visual' }))
  check(services.createMaintenanceScope(id, { scope: 'Repair' }))
  check(services.removeInspectionScope(id, id)); check(services.removeMaintenanceScope(id, id)); check(services.remove(id, 0))
  const contracts = await service('akura-marketing', 'contractService')
  const contract = { companyId: id, contractNumber: 'CON-001', contractDate: '2026-09-15', effectiveFrom: '2026-09-15', effectiveUntil: '2027-09-15' }
  check(contracts.create(contract))
  const { companyId, ...revision } = contract
  check(contracts.update(id, { ...revision, version: 0 }))
  check(contracts.approve(id, 0))
  check(contracts.remove(id, 0, '2026-10-15'))
  check(contracts.list({ companyId: id, status: 'CREATE', isActive: 'true', page: 1, limit: 20 }))
  check(contracts.listPrices({ contractId: id, page: 1, limit: 20 }))
  const items = await service('akura-marketing', 'itemService')
  check(items.create({ serviceId: id, name: 'Pipe', sizes: [{ size: '2 inch' }] }))
  check(items.addSize({ itemId: id, itemVersion: 0, size: '3 inch' }))
  const prices = { priceServicePrimary: '100.25', priceServiceSisterCompany: '99.99', priceMaintenancePrimary: null, priceMaintenanceSisterCompany: null }
  check(items.createPrice(id, prices)); check(items.updatePrice(id, { ...prices, version: 0 }))
  check(items.list({ page: 1, limit: 20, name: 'Pipe', serviceName: 'Inspection', sortBy: 'name', sortOrder: 'asc' }))
  check(items.listSizes({ itemId: id, size: '2', sortBy: 'size', sortOrder: 'asc', page: 1, limit: 20 }))
  for (const [name, payload, query] of [
    ['companyService', { name: 'Company', type: 'PT', address: 'Jakarta', npwp: '0012345678901234', isSisterCompany: false }, { search: 'Company', isSisterCompany: 'false', sortBy: 'name', sortOrder: 'asc' }],
    ['companyStaffService', { companyId: id, name: 'Contact', title: 'mr', telp: '08123456789', email: 'contact@example.com' }, { companyId: id, search: 'Contact', sortBy: 'name', sortOrder: 'asc' }],
  ]) {
    const api = await service('akura-marketing', name)
    check(api.list({ ...query, page: 1, limit: 20 })); check(api.create(payload))
    const { companyId, ...fields } = payload
    check(api.update(id, { ...fields, version: 0 })); check(api.remove(id, 0)); check(api.history(id))
  }
})
