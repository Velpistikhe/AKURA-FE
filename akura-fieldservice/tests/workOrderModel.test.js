import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessWorkOrders, canCreateWorkOrders, canEditWorkOrders, inspectorOptions, workOrderBasisLabel, workOrderCreatePayload, workOrderUpdatePayload } from '../src/modules/work-order/workOrderModel.js'

test('contract basis displays the documented contract number', () => {
  assert.equal(workOrderBasisLabel({ contractId: 'contract-id', contractSnapshot: { contractNumber: 'AKR/2026/001', number: 'obsolete-field' } }), 'Contract AKR/2026/001')
})

test('contract basis falls back to its ID when a snapshot or number is absent', () => {
  for (const contractSnapshot of [undefined, null, {}, { contractNumber: '' }]) {
    assert.equal(workOrderBasisLabel({ contractId: 'contract-id', contractSnapshot }), 'Contract contract-id')
  }
  assert.equal(workOrderBasisLabel({}), 'Contract -')
})

test('quotation basis retains quotation numbering and ID fallback', () => {
  assert.equal(workOrderBasisLabel({ quotationId: 'quotation-id', quotationSnapshot: { no: 12, numberYear: 2026 } }), 'Quotation 12/2026')
  assert.equal(workOrderBasisLabel({ quotationId: 'quotation-id' }), 'Quotation quotation-id')
})

test('Field Service creation keeps explicit quantities and inspector names', () => {
  const item = { itemSizeId: 'size-id', itemName: 'Pipe', selected: true, quantityInspection: '2.125', quantityMaintenance: '0' }
  const payload = workOrderCreatePayload({ startDate: '2026-11-05', endDate: '2026-11-06', inspectors: [' Branch Inspector '] }, {
    quotation: { id: 'quotation-id' }, items: [item], quotationItems: [item],
  })
  assert.deepEqual(payload.items, [{ itemSizeId: 'size-id', quantityInspection: 2.125, quantityMaintenance: 0 }])
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
  const item = { itemSizeId: 'size-id', itemName: 'Pipe', selected: true, quantityInspection: 1, quantityMaintenance: 0 }
  const create = (inspectors) => workOrderCreatePayload({ startDate: '2026-11-05', endDate: '2026-11-06', inspectors }, {
    quotation: { id: 'quotation-id' }, items: [item], quotationItems: [item],
  })
  for (const inspectors of [undefined, [], [' '], ['x'.repeat(256)], ['Budi', ' budi '], Array(101).fill('Budi'), [{ userId: 'old-id', name: 'Budi' }]]) {
    assert.throws(() => create(inspectors), /inspector/i)
  }
  const names = ['x'.repeat(255), ...Array.from({ length: 99 }, (_, index) => `Inspector ${index}`)]
  assert.deepEqual(create(names).inspectors, names)
})

test('work order create and edit require an active Marketing section in an assigned branch', () => {
  for (const role of ['USER', 'ADMIN', 'APP_MANAGER']) {
    const marketing = { role, isActive: true, officeBranchId: 'branch-id', section: 'MARKETING' }
    for (const permission of [canCreateWorkOrders, canEditWorkOrders]) {
      assert.equal(permission(marketing), true)
      assert.equal(permission({ ...marketing, section: 'FIELD_SERVICE' }), false)
      assert.equal(permission({ ...marketing, section: 'FINANCE' }), false)
      assert.equal(permission({ ...marketing, isActive: false }), false)
      assert.equal(permission({ ...marketing, officeBranchId: null }), false)
    }
    assert.equal(canAccessWorkOrders({ ...marketing, section: 'FIELD_SERVICE' }), true)
  }
})

test('work order updates retain the current version and unchanged forms send no mutation', () => {
  const record = { version: 7, status: 'DRAFT', quotationId: 'quotation-id', startDate: '2026-11-05', endDate: '2026-11-06', inspectors: [{ name: 'Branch Inspector' }] }
  const values = { startDate: '2026-11-05', endDate: '2026-11-06', status: 'DRAFT', inspectors: ['Branch Inspector'] }
  assert.equal(workOrderUpdatePayload(values, record), null)
  assert.deepEqual(workOrderUpdatePayload({ ...values, endDate: '2026-11-07' }, record), { endDate: '2026-11-07', version: 7 })
})
