import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolveFieldServiceRoute } from '../src/routes/fieldServiceRoutes.js'
import { canAccessWorkOrders, canEditWorkOrders, workOrderFormValues, workOrderUpdatePayload, formatHistoryValue } from '../src/modules/work-order/workOrderModel.js'
test('Field Service keeps its Work Order route and rejects unsupported creation routes', () => {
  assert.equal(resolveFieldServiceRoute('/field-service/work-orders/'), 'work-orders')
  assert.equal(resolveFieldServiceRoute('/field-service/work-orders/create'), null)
  assert.equal(resolveFieldServiceRoute('/marketing/work-orders'), null)
  assert.equal(resolveFieldServiceRoute('/field-service/work-order'), null)
  assert.equal(resolveFieldServiceRoute('/fieldservice/work-orders'), null)
  assert.equal(resolveFieldServiceRoute('/field-service'), 'overview')
})
test('Service preserves filters and exposes versioned PATCH and paginated history', async () => {
  const source = (await readFile(new URL('../src/services/workOrderService.js', import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  const { workOrderService: service } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  assert.deepEqual(Object.keys(service).sort(), ['get', 'history', 'list', 'update'])
  const request = service.list({ page: 2, limit: 20, status: 'DRAFT', revoked: false, search: 'a & b' })
  const url = new URL(request.path, 'http://localhost')
  assert.equal(url.pathname, '/fieldservice/work-orders')
  assert.equal(url.searchParams.get('revoked'), 'false')
  assert.equal(url.searchParams.get('search'), 'a & b')
  assert.equal(request.method, undefined)
  assert.deepEqual(service.get('id'), { path: '/fieldservice/work-orders/id' })
  assert.deepEqual(service.history('id', { page: 2, limit: 10 }), { path: '/fieldservice/work-orders/id/history?page=2&limit=10' })
  assert.deepEqual(service.update('id', { version: 0, status: 'COMPLETED' }), { path: '/fieldservice/work-orders/id', method: 'PATCH', body: '{"version":0,"status":"COMPLETED"}' })
})

test('Read access allows Marketing; editing follows section, never an admin bypass', () => {
  for (const role of ['USER', 'ADMIN', 'APP_MANAGER']) {
    for (const section of ['MARKETING', 'FIELD_SERVICE', 'FINANCE']) {
      const user = { role, section, isActive: true, officeBranchId: 'branch' }
      assert.equal(canAccessWorkOrders(user), role !== 'USER' || section !== 'FINANCE')
      assert.equal(canEditWorkOrders(user), section !== 'FINANCE')
      assert.equal(canEditWorkOrders({ ...user, isActive: false }), false)
      assert.equal(canEditWorkOrders({ ...user, officeBranchId: null }), false)
    }
  }
  assert.equal(canEditWorkOrders(null), false)
})

const record = { version: 0, startDate: '2026-10-02T00:00:00.000Z', endDate: '2026-10-03T00:00:00.000Z', status: 'DRAFT', summary: 'Inspection', inspectors: [{ id: 'a', name: 'Budi', position: 0 }, { id: 'b', name: 'Agus', position: 1 }], quotationId: 'quotation', quotationVersion: 4 }

test('PATCH sends changes only and preserves document snapshots and server fields', () => {
  const values = workOrderFormValues(record)
  assert.equal(workOrderUpdatePayload(values, record), null)
  assert.deepEqual(workOrderUpdatePayload({ ...values, status: 'IN_PROGRESS', number: 'forbidden', quotationId: null, officeBranchId: 'other' }, record), { status: 'IN_PROGRESS', version: 0 })
  assert.deepEqual(workOrderUpdatePayload({ ...values, endDate: '', inspectors: [] }, record), { endDate: null, inspectors: [], version: 0 })
  assert.deepEqual(workOrderUpdatePayload({ ...values, inspectors: [' Agus ', 'Budi'] }, record), { inspectors: ['Agus', 'Budi'], version: 0 })
})

test('PATCH validates dates, names, status, summary and editable record', () => {
  const values = workOrderFormValues(record)
  for (const change of [{ startDate: '2026-02-30' }, { endDate: '2026-10-01' }, { endDate: 'invalid' }, { status: 'INVALID' }, { summary: ' ' }, { summary: 'x'.repeat(20001) }, { inspectors: [' Budi ', 'bUDI'] }, { inspectors: [' '] }, { inspectors: ['x'.repeat(256)] }, { inspectors: Array.from({ length: 101 }, (_, i) => `Person ${i}`) }]) {
    assert.throws(() => workOrderUpdatePayload({ ...values, ...change }, record))
  }
  assert.throws(() => workOrderUpdatePayload(values, { ...record, revoked: true }), /Revoked/)
  assert.throws(() => workOrderUpdatePayload(values, { ...record, version: undefined }), /Reload/)
  assert.deepEqual(workOrderUpdatePayload({ ...values, endDate: values.startDate }, record), { endDate: '2026-10-02', version: 0 })
})

test('History values render empty, boolean, inspector names and snapshots', () => {
  assert.equal(formatHistoryValue(null), '-')
  assert.equal(formatHistoryValue([]), '-')
  assert.equal(formatHistoryValue(false), 'No')
  assert.equal(formatHistoryValue(['Budi', 'Agus']), 'Budi, Agus')
  assert.equal(formatHistoryValue({ number: 'CTR/2026/1' }), 'CTR/2026/1')
})
test('Read access follows backend active-user and branch restrictions', () => {
  const user = { section: 'FIELD_SERVICE', isActive: true, officeBranchId: 'branch' }
  assert.equal(canAccessWorkOrders(user), true)
  assert.equal(canAccessWorkOrders({ ...user, isActive: false }), false)
  assert.equal(canAccessWorkOrders({ ...user, officeBranchId: null }), false)
})
