import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessWorkOrders, workOrderPayload } from '../src/modules/work-order/workOrderModel.js'

const values = { basis: 'quotation', quotationId: 'quote', companyId: 'company', startDate: '2026-09-16', endDate: '2026-09-17', status: 'DRAFT', summary: ' Inspection ', inspectors: [' Budi ', 'Agus'], number: 'forbidden', date: '2020-01-01', contractId: 'forbidden' }
const quote = { id: 'quote', version: 7, status: 'APPROVED', isActive: true, items: [{ priceSelection: { priceSource: 'NORMAL' } }] }
test('Quotation basis sends current version and excludes server-owned and opposite basis fields', () => {
  assert.deepEqual(workOrderPayload(values, quote), { quotationId: 'quote', quotationVersion: 7, startDate: '2026-09-16', endDate: '2026-09-17', status: 'DRAFT', summary: 'Inspection', inspectors: ['Budi', 'Agus'] })
})
test('Company basis delegates contract resolution to the backend', () => {
  const payload = workOrderPayload({ ...values, basis: 'company', endDate: '', inspectors: [] })
  assert.equal(payload.companyId, 'company')
  assert.equal(payload.endDate, null)
  for (const key of ['quotationId', 'quotationVersion', 'contractId', 'contractVersion', 'number', 'date']) assert.equal(Object.hasOwn(payload, key), false)
})
test('Rejects invalid quotation references and contract priced quotations', () => {
  for (const change of [{ id: 'other' }, { version: null }, { isActive: false }, { status: 'DRAFT' }]) assert.throws(() => workOrderPayload(values, { ...quote, ...change }), /approved quotation/)
  assert.throws(() => workOrderPayload(values, { ...quote, items: [{ priceSelection: { priceSource: 'CONTRACT' } }] }), /Company Contract/)
  assert.throws(() => workOrderPayload({ ...values, basis: 'company', companyId: null }), /basis/)
})
test('Validates dates, summary and unique inspector names', () => {
  for (const change of [{ startDate: '' }, { endDate: '2026-09-15' }, { summary: ' ' }, { summary: 'x'.repeat(20001) }, { status: 'INVALID' }, { inspectors: ['Budi', ' bUDI '] }, { inspectors: [' '] }, { inspectors: ['x'.repeat(256)] }, { inspectors: Array.from({ length: 101 }, (_, index) => `Inspector ${index}`) }]) assert.throws(() => workOrderPayload({ ...values, ...change }, quote))
  assert.equal(workOrderPayload({ ...values, endDate: values.startDate }, quote).endDate, values.startDate)
})
test('Access follows the backend actor guard', () => {
  const user = { role: 'USER', section: 'MARKETING', isActive: true, officeBranchId: 'branch' }
  assert.equal(canAccessWorkOrders(user), false)
  for (const access of [{ role: 'ADMIN' }, { role: 'APP_MANAGER' }, { section: 'FIELD_SERVICE' }]) {
    assert.equal(canAccessWorkOrders({ ...user, ...access }), true)
    assert.equal(canAccessWorkOrders({ ...user, ...access, isActive: false }), false)
    assert.equal(canAccessWorkOrders({ ...user, ...access, officeBranchId: null }), false)
  }
  assert.equal(canAccessWorkOrders(null), false)
})
