import assert from 'node:assert/strict'
import test from 'node:test'
import { canCreateWorkOrders, canCreateWorkOrderFromQuotation, workOrderPayload, quotationWorkOrderPayload } from '../src/modules/work-order/workOrderModel.js'
import { readFile } from 'node:fs/promises'

const inspectorIds = ['00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2']
const inspectorOptions = inspectorIds.map((id, index) => ({ id, name: ['Budi Santoso', 'Agus Wijaya'][index] }))
const values = { basis: 'quotation', quotationId: '00000000-0000-4000-8000-000000000009', companyId: '00000000-0000-4000-8000-000000000001', startDate: '2026-09-16', endDate: '2026-09-17', status: 'DRAFT', inspectors: inspectorIds, number: 'forbidden', date: '2020-01-01', contractId: 'forbidden' }
const quote = { id: values.quotationId, version: 7, status: 'APPROVED', isActive: true, items: [{ priceSelection: { priceSource: 'NORMAL' } }] }
test('Quotation basis sends its ID without server-owned or unsupported fields', () => {
  const expectedInspectors = inspectorOptions.map(({ id, name }) => ({ userId: id, name }))
  assert.deepEqual(workOrderPayload(values, quote, inspectorOptions), { quotationId: quote.id, startDate: '2026-09-16', endDate: '2026-09-17', inspectors: expectedInspectors })
  assert.equal(Object.hasOwn(workOrderPayload({ ...values, status: 'COMPLETED' }, quote, inspectorOptions), 'status'), false)
  assert.equal(Object.hasOwn(workOrderPayload({ ...values, summary: 'ignored' }, quote, inspectorOptions), 'summary'), false)
})
test('Quotation is the only basis Marketing may submit', () => {
  // Contract/company basis creation has no Marketing UI; every other basis must be rejected.
  for (const basis of [{ basis: 'company', companyId: values.companyId }, { basis: 'contract', contractId: 'forbidden' }, { basis: undefined }]) {
    assert.throws(() => workOrderPayload({ ...values, ...basis }, quote, inspectorOptions), /only work order basis/)
  }
  assert.throws(() => workOrderPayload({ ...values, basis: 'quotation', quotationId: undefined }, quote, inspectorOptions), /approved quotation/)
})
test('Rejects invalid quotation references and contract priced quotations', () => {
  for (const change of [{ id: 'other' }, { isActive: false }, { status: 'DRAFT' }]) assert.throws(() => workOrderPayload(values, { ...quote, ...change }, inspectorOptions), /approved quotation/)
  assert.throws(() => workOrderPayload(values, { ...quote, items: [{ priceSelection: { priceSource: 'CONTRACT' } }] }, inspectorOptions), /contract prices/)
})
test('Validates quotation dates and unique inspector IDs', () => {
  for (const change of [{ startDate: '' }, { startDate: '2026-02-30' }, { endDate: '' }, { endDate: 'invalid' }, { endDate: '2026-09-15' }, { inspectors: [] }, { inspectors: [inspectorIds[0], inspectorIds[0]] }, { inspectors: ['not-an-id'] }, { inspectors: Array.from({ length: 101 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`) }]) assert.throws(() => workOrderPayload({ ...values, ...change }, quote, inspectorOptions))
  assert.equal(workOrderPayload({ ...values, endDate: values.startDate }, quote, inspectorOptions).endDate, values.startDate)
  assert.throws(() => workOrderPayload(values, quote, []), /no longer available/)
})

test('Only Marketing can create; quotations must be active, approved and not contract priced', () => {
  const user = { role: 'USER', section: 'MARKETING', isActive: true, officeBranchId: 'branch' }
  assert.equal(canCreateWorkOrderFromQuotation(user, quote), true)
  for (const changes of [{ section: 'FIELD_SERVICE' }, { role: 'ADMIN', section: 'FINANCE' }, { role: 'APP_MANAGER', section: null }, { isActive: false }, { officeBranchId: null }]) {
    assert.equal(canCreateWorkOrders({ ...user, ...changes }), false)
  }
  for (const changes of [{ status: 'DRAFT' }, { isActive: false }, { items: [{ priceSelection: { priceSource: 'CONTRACT' } }] }]) {
    assert.equal(canCreateWorkOrderFromQuotation(user, { ...quote, ...changes }), false)
  }
})

test('Quotation work order endpoint receives the quotation ID and only documented create fields', async () => {
  const payload = quotationWorkOrderPayload(values, quote, inspectorOptions)
  assert.deepEqual(payload, { quotationId: quote.id, startDate: '2026-09-16', endDate: '2026-09-17', inspectors: inspectorOptions.map(({ id, name }) => ({ userId: id, name })) })
  const source = (await readFile(new URL('../src/services/quotationService.js', import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  const { quotationService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  assert.deepEqual(quotationService.createWorkOrder(quote.id, payload), { path: `/marketing/quotations/${quote.id}/work-orders`, method: 'POST', body: JSON.stringify(payload) })
})

test('Inspector options are the only Field Service request Marketing still makes', async () => {
  const source = (await readFile(new URL('../src/services/workOrderService.js', import.meta.url), 'utf8'))
    .replace("import { apiRequest } from './api'", 'const apiRequest = (path, options = {}) => ({ path, ...options })')
  const { workOrderService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  assert.deepEqual(Object.keys(workOrderService), ['inspectors'])
  assert.deepEqual(workOrderService.inspectors(), { path: '/fieldservice/options/inspectors' })
})
