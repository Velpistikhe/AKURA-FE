import assert from 'node:assert/strict'
import test from 'node:test'
import { quotationChanges, quotationFormValues, quotationPayload, quotationTextMaxLength } from '../src/modules/quotation/quotationModel.js'
import { quotationWorkOrderPayload } from '../src/modules/work-order/workOrderModel.js'

const longFields = ['supplyAkura', 'supplyCustomer', 'accomplished', 'deliveryReports', 'deliveryInvoice']
const multiline = (length) => `First line\n${'x'.repeat(length - 11)}`

test('quotation form limits accept 256 and 5000 characters and exclude 5001 for long terms', () => {
  for (const key of longFields) {
    assert.equal(quotationTextMaxLength(key), 5000)
    for (const length of [256, 5000]) assert.ok(multiline(length).length <= quotationTextMaxLength(key))
    assert.ok(multiline(5001).length > quotationTextMaxLength(key))
  }
  for (const key of ['jobStart', 'subject', 'termOfPayment', 'validity', 'location']) {
    assert.equal(quotationTextMaxLength(key), 255)
    assert.ok(multiline(256).length > quotationTextMaxLength(key))
  }
})

for (const length of [256, 5000]) {
  test(`create, edit and copy preserve ${length}-character multiline quotation terms`, () => {
    const text = multiline(length)
    const values = {
      ...Object.fromEntries(longFields.map((key) => [key, text])),
      inquiryDate: '2026-11-05', inquiryMethod: 'EMAIL', staffId: 'staff-id',
      companySnapshot: { id: 'company-id' },
      items: [{ id: 'old-line-id', itemSizeId: 'size-id', quantityInspection: '2', quantityMaintenance: '0', discount: '10', isActive: true }],
    }
    const original = { ...values, accomplished: 'Old completion terms', deliveryReports: 'Old reports', deliveryInvoice: 'Old invoice terms' }
    const created = quotationPayload(values, { create: true })
    const copied = quotationPayload(quotationFormValues(values), { create: true })
    const changes = quotationChanges(quotationFormValues(values), original)
    for (const key of longFields) {
      assert.equal(created[key], text)
      assert.equal(copied[key], text)
    }
    for (const key of ['accomplished', 'deliveryReports', 'deliveryInvoice']) assert.equal(changes[key], text)
    assert.equal(created.companyId, 'company-id')
    assert.equal(Object.hasOwn(copied.items[0], 'id'), false)
    assert.equal(Object.hasOwn(changes, 'companyId'), false)
  })
}

test('Marketing work order creation sends item selections without client quantities', () => {
  const quotationId = '00000000-0000-4000-8000-000000000001'
  const itemSizeId = '00000000-0000-4000-8000-000000000002'
  const inspectorId = '00000000-0000-4000-8000-000000000003'
  const payload = quotationWorkOrderPayload({
    startDate: '2026-11-05', endDate: '2026-11-06', inspectors: [inspectorId], items: [itemSizeId],
  }, { id: quotationId, status: 'APPROVED', isActive: true, items: [{ itemSizeId, quantityInspection: '4' }] }, [{ id: inspectorId, name: 'Branch Inspector' }])
  assert.deepEqual(payload.items, [{ itemSizeId }])
  assert.deepEqual(payload.inspectors, [{ userId: inspectorId, name: 'Branch Inspector' }])
  assert.equal(payload.quotationId, quotationId)
})
