import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessWorkOrders, canCreateWorkOrders, canEditWorkOrders, inspectorOptions, normalizeQuantity, workOrderBasisLabel, workOrderCreateComplete, workOrderCreatePayload, workOrderUpdatePayload } from '../src/modules/work-order/workOrderModel.js'

const quotationId = '00000000-0000-4000-8000-000000000001'
const itemSizeId = '00000000-0000-4000-8000-000000000002'
const companyId = '00000000-0000-4000-8000-000000000003'
const contractId = '00000000-0000-4000-8000-000000000004'

test('contract basis displays the documented contract number', () => {
  assert.equal(workOrderBasisLabel({ contractId: 'contract-id', contractSnapshot: { contractNumber: 'AKR/2026/001', number: 'obsolete-field' } }), 'Contract AKR/2026/001')
})

test('contract basis falls back to its ID when a snapshot or number is absent', () => {
  for (const contractSnapshot of [undefined, null, {}, { contractNumber: '' }]) {
    assert.equal(workOrderBasisLabel({ contractId: 'contract-id', contractSnapshot }), 'Contract contract-id')
  }
  assert.equal(workOrderBasisLabel({}), 'Company -')
  assert.equal(workOrderBasisLabel({ companyId, company: 'Branch Company' }), 'Company Branch Company')
})

test('quotation basis retains quotation numbering and ID fallback', () => {
  assert.equal(workOrderBasisLabel({ quotationId: 'quotation-id', quotationSnapshot: { no: 12, numberYear: 2026 } }), 'Quotation 12/2026')
  assert.equal(workOrderBasisLabel({ quotationId: 'quotation-id' }), 'Quotation quotation-id')
})

test('Field Service creation keeps explicit quantities and inspector names', () => {
  const item = { itemSizeId, itemName: 'Pipe', selected: true, quantityInspection: '2.125', quantityMaintenance: '0' }
  const payload = workOrderCreatePayload({ startDate: '2026-11-05', endDate: '2026-11-06', inspectors: [' Branch Inspector '] }, {
    quotation: { id: quotationId }, items: [item], quotationItems: [item],
  })
  assert.deepEqual(payload.items, [{ itemSizeId, quantityInspection: 2.125, quantityMaintenance: 0 }])
  assert.deepEqual(payload.inspectors, ['Branch Inspector'])
})

test('Field Service inspector options support reduced Auth users and deduplicate display names', () => {
  assert.deepEqual(inspectorOptions([
    { id: 'one', firstName: ' Budi ', lastName: ' Santoso ', branch: 'Jakarta' },
    { id: 'two', firstName: 'budi', lastName: 'santoso' },
    { id: 'three', firstName: 'Siti', lastName: null },
    { id: 'four', firstName: '', lastName: null },
    { id: 'five', firstName: 'x'.repeat(256) },
  ]), [{ value: 'Budi Santoso', label: 'Budi Santoso' }, { value: 'Siti', label: 'Siti' }])
})

test('Field Service creation validates inspector names instead of user ID pairs', () => {
  const item = { itemSizeId, itemName: 'Pipe', selected: true, quantityInspection: 1, quantityMaintenance: 0 }
  const create = (inspectors) => workOrderCreatePayload({ startDate: '2026-11-05', endDate: '2026-11-06', inspectors }, {
    quotation: { id: quotationId }, items: [item], quotationItems: [item],
  })
  for (const inspectors of [undefined, [], [' '], ['x'.repeat(256)], ['Budi', ' budi '], Array(101).fill('Budi'), [{ userId: 'old-id', name: 'Budi' }]]) {
    assert.throws(() => create(inspectors), /inspector/i)
  }
  const names = ['x'.repeat(255), ...Array.from({ length: 99 }, (_, index) => `Inspector ${index}`)]
  assert.deepEqual(create(names).inspectors, names)
})

test('work order creation and editing require the branch-scoped Marketing USER role', () => {
  for (const role of ['USER', 'ADMIN', 'APP_MANAGER']) {
    const marketing = { role, isActive: true, officeBranchId: 'branch-id', section: 'MARKETING' }
    assert.equal(canCreateWorkOrders(marketing), role === 'USER')
    assert.equal(canEditWorkOrders(marketing), role === 'USER')
    for (const permission of [canCreateWorkOrders, canEditWorkOrders]) {
      assert.equal(permission({ ...marketing, section: 'FIELD_SERVICE' }), false)
      assert.equal(permission({ ...marketing, section: 'FINANCE' }), false)
      assert.equal(permission({ ...marketing, isActive: false }), false)
      assert.equal(permission({ ...marketing, officeBranchId: null }), false)
    }
    assert.equal(canAccessWorkOrders({ ...marketing, section: 'FIELD_SERVICE' }), true)
  }
})

test('quotation creation additionally allows Marketing ADMIN without allowing company creation or editing', () => {
  for (const role of ['USER', 'ADMIN', 'APP_MANAGER', undefined, 'UNKNOWN']) {
    const user = { role, isActive: true, officeBranchId: 'branch-id', section: 'MARKETING' }
    assert.equal(canCreateWorkOrders(user, 'quotation'), ['USER', 'ADMIN'].includes(role))
    assert.equal(canCreateWorkOrders(user, 'company'), role === 'USER')
    assert.equal(canEditWorkOrders(user), role === 'USER')
    assert.equal(canCreateWorkOrders(user, 'unknown'), false)
    for (const other of [{ ...user, section: 'FIELD_SERVICE' }, { ...user, section: 'FINANCE' }, { ...user, isActive: false }, { ...user, officeBranchId: null }]) {
      assert.equal(canCreateWorkOrders(other, 'quotation'), false)
    }
  }
})

const companyValues = {
  basis: 'company', startDate: '2026-11-05', subject: ' Site inspection ', officialReport: false,
  dailyReport: '2026-11-05', officialReportDelivery: '2026-11-07', dailyReportDelivery: '2026-11-06',
  poNumber: ' PO-001 ', poDate: '2026-11-01', inspectors: ['Branch Inspector'],
}
const selectedItem = { itemSizeId, selected: true, quantityInspection: '2.125', quantityMaintenance: '0', priceInspection: '500' }
const companyContext = { company: { id: companyId, contract: { id: contractId } }, items: [selectedItem] }

test('standalone creates from a company without requiring quotation, contract or end date', () => {
  const payload = workOrderCreatePayload({ ...companyValues, quotationId, status: 'IN_PROGRESS', officeBranchId: 'wrong-branch' }, companyContext)
  assert.deepEqual(payload, {
    companyId, subject: 'Site inspection', officialReport: false, dailyReport: '2026-11-05',
    officialReportDelivery: '2026-11-07', dailyReportDelivery: '2026-11-06', poNumber: 'PO-001', poDate: '2026-11-01',
    startDate: '2026-11-05', inspectors: ['Branch Inspector'],
    items: [{ itemSizeId, quantityInspection: 2.125, quantityMaintenance: 0 }],
  })
  assert.equal(workOrderCreateComplete(companyValues, 1), true)
  assert.equal(workOrderCreateComplete({ ...companyValues, basis: 'quotation' }, 1), false)
})

test('standalone requires every header and rejects revoked companies and mismatched contracts', () => {
  for (const key of ['subject', 'officialReport', 'dailyReport', 'officialReportDelivery', 'dailyReportDelivery', 'poNumber', 'poDate']) {
    assert.throws(() => workOrderCreatePayload({ ...companyValues, [key]: undefined }, companyContext))
  }
  assert.throws(() => workOrderCreatePayload(companyValues, { ...companyContext, company: { id: companyId, revoked: true } }), /active company/)
  assert.throws(() => workOrderCreatePayload({ ...companyValues, contractId: quotationId }, companyContext), /contract/)
  assert.equal(workOrderCreatePayload({ ...companyValues, contractId }, companyContext).contractId, contractId)
  assert.throws(() => workOrderCreatePayload({ ...companyValues, endDate: '2026-11-04' }, companyContext), /End date/)
  assert.throws(() => workOrderCreatePayload({ ...companyValues, poDate: '2026-02-30' }, companyContext), /po date/)
})

test('quotation creation accepts an optional subject and omits empty headers and unrelated IDs', () => {
  const values = { basis: 'quotation', startDate: '2026-11-05', endDate: '2026-11-06', inspectors: ['Branch Inspector'],
    subject: ' Custom quotation subject ', poNumber: '', poDate: '', companyId, contractId }
  const context = { quotation: { id: quotationId }, quotationItems: [selectedItem], items: [selectedItem] }
  assert.deepEqual(workOrderCreatePayload(values, context), {
    quotationId, subject: 'Custom quotation subject', startDate: values.startDate, endDate: values.endDate, inspectors: values.inspectors,
    items: [{ itemSizeId, quantityInspection: 2.125, quantityMaintenance: 0 }],
  })
  assert.throws(() => workOrderCreatePayload(values, { ...context, quotationItems: [] }), /belong/)
  assert.throws(() => workOrderCreatePayload(values, { ...context, quotationItems: [{ ...selectedItem, isActive: false }] }), /belong/)
  assert.throws(() => workOrderCreatePayload(values, { ...context, items: [selectedItem, selectedItem] }), /unique/)
  assert.throws(() => workOrderCreatePayload({ ...values, endDate: '' }, context), /end date/)
  assert.equal(Object.hasOwn(workOrderCreatePayload({ ...values, subject: '' }, context), 'subject'), false)
  for (const subject of [' ', 'x'.repeat(256), true]) assert.throws(() => workOrderCreatePayload({ ...values, subject }, context), /subject/)
})

test('creation validates quantity bounds and precision without coercing empty or boolean values to zero', () => {
  for (const value of ['', ' ', null, undefined, true, false, -1, '1.0001', 1e12, Infinity, NaN]) {
    assert.equal(normalizeQuantity(value), null)
    assert.throws(() => workOrderCreatePayload(companyValues, { ...companyContext, items: [{ ...selectedItem, quantityInspection: value }] }), /quantity/)
  }
  for (const value of [0, '0', '2.125', '999999999999.999']) assert.equal(normalizeQuantity(value), Number(value))
})

test('creation follows the documented minimum item count without imposing the old 100-item limit', () => {
  const items = Array.from({ length: 101 }, (_, index) => ({ ...selectedItem,
    itemSizeId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` }))
  assert.equal(workOrderCreatePayload(companyValues, { ...companyContext, items }).items.length, 101)
  assert.equal(workOrderCreateComplete(companyValues, 101), true)
})

test('work order updates retain the current version and unchanged forms send no mutation', () => {
  const record = { version: 7, status: 'DRAFT', quotationId: 'quotation-id', startDate: '2026-11-05', endDate: '2026-11-06', inspectors: [{ name: 'Branch Inspector' }] }
  const values = { startDate: '2026-11-05', endDate: '2026-11-06', status: 'DRAFT', inspectors: ['Branch Inspector'] }
  assert.equal(workOrderUpdatePayload(values, record), null)
  assert.deepEqual(workOrderUpdatePayload({ ...values, endDate: '2026-11-07' }, record), { endDate: '2026-11-07', version: 7 })
})
