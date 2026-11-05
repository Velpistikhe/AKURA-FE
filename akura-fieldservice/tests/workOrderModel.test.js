import assert from 'node:assert/strict'
import test from 'node:test'
import { workOrderBasisLabel, workOrderCreatePayload, workOrderUpdatePayload } from '../src/modules/work-order/workOrderModel.js'

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

test('Field Service creation keeps explicit quantities and branch inspector pairs', () => {
  const item = { itemSizeId: 'size-id', itemName: 'Pipe', selected: true, quantityInspection: '2.125', quantityMaintenance: '0' }
  const payload = workOrderCreatePayload({ startDate: '2026-11-05', endDate: '2026-11-06', inspectors: ['inspector-id'] }, {
    quotation: { id: 'quotation-id' }, items: [item], quotationItems: [item], inspectors: [{ id: 'inspector-id', name: 'Branch Inspector' }],
  })
  assert.deepEqual(payload.items, [{ itemSizeId: 'size-id', quantityInspection: 2.125, quantityMaintenance: 0 }])
  assert.deepEqual(payload.inspectors, [{ userId: 'inspector-id', name: 'Branch Inspector' }])
})

test('work order updates retain the current version and unchanged forms send no mutation', () => {
  const record = { version: 7, status: 'DRAFT', quotationId: 'quotation-id', startDate: '2026-11-05', endDate: '2026-11-06', inspectors: [{ name: 'Branch Inspector' }] }
  const values = { startDate: '2026-11-05', endDate: '2026-11-06', status: 'DRAFT', inspectors: ['Branch Inspector'] }
  assert.equal(workOrderUpdatePayload(values, record), null)
  assert.deepEqual(workOrderUpdatePayload({ ...values, endDate: '2026-11-07' }, record), { endDate: '2026-11-07', version: 7 })
})
