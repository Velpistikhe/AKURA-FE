import assert from 'node:assert/strict'
import test from 'node:test'
import { canCreateWorkOrderFromQuotation, canCreateWorkOrders, normalizeQuantity, quotationWorkOrderPayload, workOrderFormComplete } from '../src/modules/work-order/workOrderModel.js'

const itemSizeId = '00000000-0000-4000-8000-000000000002'
const item = { itemSizeId, quantityInspection: '2.125', quantityMaintenance: '0' }
const quotation = { id: '00000000-0000-4000-8000-000000000001', isActive: true, status: 'APPROVED', items: [item] }
const values = { startDate: '2026-11-05', endDate: '2026-11-06', inspectors: ['Branch Inspector'], items: [item] }

test('quotation creation allows branch-scoped Marketing USER and ADMIN with an eligible quotation', () => {
  const user = { isActive: true, officeBranchId: 'branch-id', section: 'MARKETING', role: 'USER' }
  for (const role of ['USER', 'ADMIN']) {
    const actor = { ...user, role }
    assert.equal(canCreateWorkOrders(actor), true)
    assert.equal(canCreateWorkOrderFromQuotation(actor, quotation), true)
    for (const other of [{ ...actor, section: 'FIELD_SERVICE' }, { ...actor, section: 'FINANCE' }, { ...actor, officeBranchId: null }, { ...actor, isActive: false }]) {
      assert.equal(canCreateWorkOrders(other), false)
      assert.equal(canCreateWorkOrderFromQuotation(other, quotation), false)
    }
    for (const other of [{ ...quotation, status: 'CREATED' }, { ...quotation, isActive: false }, { ...quotation, hasWorkOrder: true }, { ...quotation, workOrderId: 'existing-id' }]) {
      assert.equal(canCreateWorkOrderFromQuotation(actor, other), false)
    }
  }
  for (const role of ['APP_MANAGER', undefined, 'UNKNOWN']) {
    assert.equal(canCreateWorkOrders({ ...user, role }), false)
    assert.equal(canCreateWorkOrderFromQuotation({ ...user, role }, quotation), false)
  }
})

test('quotation creation preserves optional subject and headers, explicit false and server defaults', () => {
  const payload = quotationWorkOrderPayload({ ...values, subject: ' Site inspection ', officialReport: false,
    poNumber: ' PO-001 ', dailyReport: '2026-11-05', officialReportDelivery: '2026-11-07',
    dailyReportDelivery: '2026-11-06', poDate: '2026-11-01' }, quotation)
  assert.deepEqual(payload, {
    quotationId: quotation.id, startDate: values.startDate, endDate: values.endDate, inspectors: values.inspectors,
    subject: 'Site inspection', officialReport: false, poNumber: 'PO-001', dailyReport: '2026-11-05',
    officialReportDelivery: '2026-11-07', dailyReportDelivery: '2026-11-06', poDate: '2026-11-01',
    items: [{ itemSizeId, quantityInspection: 2.125, quantityMaintenance: 0 }],
  })
  const defaults = quotationWorkOrderPayload({ ...values, subject: '', poNumber: '', dailyReport: '', poDate: '' }, quotation)
  assert.equal(Object.hasOwn(defaults, 'subject'), false)
  assert.equal(Object.hasOwn(defaults, 'poDate'), false)
})

test('quotation creation rejects invalid headers, dates, duplicate and unrelated or inactive items', () => {
  for (const invalid of [
    { poNumber: 'x'.repeat(101) }, { officialReport: 'false' }, { subject: 'x'.repeat(256) }, { subject: ' ' },
    { poDate: '2026-02-30' }, { startDate: '2026-02-30' }, { endDate: '2026-11-04' },
    { items: [item, item] }, { items: [] }, { items: [itemSizeId] },
    { items: [{ ...item, itemSizeId: '00000000-0000-4000-8000-000000000003' }] },
  ]) assert.throws(() => quotationWorkOrderPayload({ ...values, ...invalid }, quotation))
  assert.throws(() => quotationWorkOrderPayload(values, { ...quotation, items: [{ ...item, isActive: false }] }), /belong/)
  assert.throws(() => quotationWorkOrderPayload(values, { ...quotation, status: 'REVISED' }), /approved/)
})

test('Marketing quantities retain three-decimal precision and reject invalid or missing amounts', () => {
  for (const value of ['', ' ', null, undefined, true, false, -1, '1.0001', 1e12, Infinity, NaN]) {
    assert.equal(normalizeQuantity(value), null)
    assert.throws(() => quotationWorkOrderPayload({ ...values, items: [{ ...item, quantityInspection: value }] }, quotation), /quantities/)
  }
  for (const value of [0, '0', '2.125', '999999999999.999']) assert.equal(normalizeQuantity(value), Number(value))
})

test('quotation creation follows the Swagger item minimum without the old 100-item limit', () => {
  const items = Array.from({ length: 101 }, (_, index) => ({ ...item,
    itemSizeId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` }))
  assert.equal(quotationWorkOrderPayload({ ...values, items }, { ...quotation, items }).items.length, 101)
  assert.equal(workOrderFormComplete(values, 101), true)
})
