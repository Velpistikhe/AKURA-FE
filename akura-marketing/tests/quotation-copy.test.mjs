import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canCopyQuotation, quotationFormValues, quotationPayload } from '../src/modules/quotation/quotationModel.js'

test('Only revised and approved quotations support copying, including historical revisions', () => {
  for (const status of ['CREATED', 'SENT', 'REVISED', 'APPROVED', 'REJECTED', undefined]) {
    for (const isActive of [true, false]) {
      assert.equal(canCopyQuotation({ status, isActive }), ['REVISED', 'APPROVED'].includes(status))
    }
  }
  assert.equal(canCopyQuotation(null), false)
})

test('Copy defaults create new lines without source identity or lifecycle metadata', () => {
  const source = {
    id: 'original', version: 8, no: 12, revision: 2, status: 'APPROVED', previousQuotationId: 'previous',
    companySnapshot: { id: 'company-1' }, staffId: 'contact-1', subject: 'Original subject',
    inquiryMethod: 'EMAIL', inquiryDate: '2026-09-22T00:00:00Z',
    items: [{ id: 'old-line', version: 4, itemSizeId: 'size-1', quantityInspection: '2.500', quantityMaintenance: '0.000', note: 'Original note', priceInspection: '100' },
      { id: 'inactive-line', itemSizeId: 'size-2', isActive: false }],
  }
  const before = structuredClone(source)
  const values = quotationFormValues(source)
  values.subject = 'New subject'
  values.items[0].quantityInspection = '3'
  const payload = quotationPayload(values, { create: true })
  assert.equal(payload.companyId, 'company-1')
  assert.equal(payload.staffId, 'contact-1')
  assert.equal(payload.subject, 'New subject')
  assert.equal(payload.inquiryDate, '2026-09-22')
  assert.deepEqual(payload.items, [{ itemSizeId: 'size-1', quantityInspection: '3', quantityMaintenance: '0', note: 'Original note' }])
  for (const key of ['id', 'version', 'no', 'revision', 'status', 'previousQuotationId']) assert.equal(key in payload, false)
  assert.deepEqual(source, before)
})
