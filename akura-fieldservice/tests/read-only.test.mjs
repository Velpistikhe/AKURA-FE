import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolveFieldServiceRoute } from '../src/routes/fieldServiceRoutes.js'
import { canAccessWorkOrders } from '../src/modules/work-order/workOrderModel.js'
import { resolveMenuPath, workOrderMfe } from '../../akura-shell/src/routes/workOrderRouting.js'

const marketing = { key: 'marketing', items: [{ key: 'work-orders' }] }
const field = { key: 'field-service', items: [{ key: 'work-orders' }] }
test('Work order navigation uses canonical field-service paths without affecting other modules', () => {
  for (const key of ['marketing', 'field-service', 'fieldservice']) assert.equal(resolveMenuPath(key, 'work-orders'), '/field-service/work-orders')
  assert.equal(resolveMenuPath('marketing', 'quotations'), '/marketing/quotations')
  assert.equal(resolveMenuPath('/referensi/', '/taxes/'), '/referensi/taxes')
})
test('Menu access selects the MFE and Field Service stays read-only even with both menus', () => {
  assert.equal(workOrderMfe([marketing], { section: 'MARKETING' }), 'marketing')
  assert.equal(workOrderMfe([field], { role: 'ADMIN', section: 'MARKETING' }), 'fieldservice')
  assert.equal(workOrderMfe([marketing, field], { section: 'FIELD_SERVICE' }), 'fieldservice')
  assert.equal(workOrderMfe([marketing], { section: 'FIELD_SERVICE' }), 'fieldservice')
  assert.equal(workOrderMfe([{ key: 'marketing', items: [] }], { role: 'ADMIN' }), null)
})
test('Field Service rejects creation and legacy Marketing routes', () => {
  assert.equal(resolveFieldServiceRoute('/field-service/work-orders/'), 'work-orders')
  assert.equal(resolveFieldServiceRoute('/field-service/work-orders/create'), null)
  assert.equal(resolveFieldServiceRoute('/marketing/work-orders'), null)
  assert.equal(resolveFieldServiceRoute('/field-service'), 'overview')
})
test('Service exposes GET only and preserves pagination, search and false filters', async () => {
  const source = (await readFile(new URL('../src/services/workOrderService.js', import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  const { workOrderService: service } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  assert.deepEqual(Object.keys(service).sort(), ['get', 'list'])
  const request = service.list({ page: 2, limit: 20, status: 'DRAFT', revoked: false, search: 'a & b' })
  const url = new URL(request.path, 'http://localhost')
  assert.equal(url.pathname, '/fieldservice/work-orders')
  assert.equal(url.searchParams.get('revoked'), 'false')
  assert.equal(url.searchParams.get('search'), 'a & b')
  assert.equal(request.method, undefined)
  assert.deepEqual(service.get('id'), { path: '/fieldservice/work-orders/id' })
})
test('Read access follows backend active-user and branch restrictions', () => {
  const user = { section: 'FIELD_SERVICE', isActive: true, officeBranchId: 'branch' }
  assert.equal(canAccessWorkOrders(user), true)
  assert.equal(canAccessWorkOrders({ ...user, isActive: false }), false)
  assert.equal(canAccessWorkOrders({ ...user, officeBranchId: null }), false)
})
