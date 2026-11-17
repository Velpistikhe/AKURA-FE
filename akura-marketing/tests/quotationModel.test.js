import assert from 'node:assert/strict'
import test from 'node:test'
import { money, quotationChanges, quotationFormValues, quotationPayload, quotationTextMaxLength } from '../src/modules/quotation/quotationModel.js'
import { inspectorOptions, quotationWorkOrderPayload } from '../src/modules/work-order/workOrderModel.js'

const longFields = ['supplyAkura', 'supplyCustomer', 'accomplished', 'deliveryReports', 'deliveryInvoice']
const multiline = (length) => `First line\n${'x'.repeat(length - 11)}`

test('quotation preview formats stored item discounts, including zero and missing historical values', () => {
  for (const [discount, expected] of [
    [0, '0.00'], ['0.00', '0.00'], ['10.50', '10.50'], ['100', '100.00'],
    [null, '-'], [undefined, '-'],
  ]) {
    assert.equal(money(discount), expected)
  }
})

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

test('Marketing work order creation preserves selected quotation quantities without prices or server-owned fields', () => {
  const quotationId = '00000000-0000-4000-8000-000000000001'
  const itemSizeId = '00000000-0000-4000-8000-000000000002'
  const maintenanceSizeId = '00000000-0000-4000-8000-000000000003'
  const quotationItems = [
    { itemSizeId, quantityInspection: '2.125', quantityMaintenance: '0', priceInspection: '500', isActive: true },
    { itemSizeId: maintenanceSizeId, quantityInspection: '0', quantityMaintenance: '0.750', priceMaintenance: '250', isActive: true },
  ]
  const payload = quotationWorkOrderPayload({
    startDate: '2026-11-05', endDate: '2026-11-06', inspectors: [' Branch Inspector '],
    companyId: 'untrusted-company', officeBranchId: 'untrusted-branch', status: 'IN_PROGRESS',
    items: quotationItems,
  }, { id: quotationId, status: 'APPROVED', isActive: true, items: quotationItems })
  assert.deepEqual(payload.items, [
    { itemSizeId, quantityInspection: 2.125, quantityMaintenance: 0 },
    { itemSizeId: maintenanceSizeId, quantityInspection: 0, quantityMaintenance: 0.75 },
  ])
  assert.deepEqual(payload.inspectors, ['Branch Inspector'])
  assert.equal(payload.quotationId, quotationId)
  assert.deepEqual(Object.keys(payload).sort(), ['endDate', 'inspectors', 'items', 'quotationId', 'startDate'])
})

test('Marketing inspector options support reduced Auth users and deduplicate display names', () => {
  assert.deepEqual(inspectorOptions([
    { id: 'one', firstName: ' Budi ', lastName: ' Santoso ', branch: 'Jakarta' },
    { id: 'two', firstName: 'budi', lastName: 'santoso' },
    { id: 'three', firstName: 'Siti', lastName: null },
    { id: 'four', firstName: '', lastName: null },
    { id: 'five', firstName: 'x'.repeat(256) },
  ]), [{ value: 'Budi Santoso', label: 'Budi Santoso' }, { value: 'Siti', label: 'Siti' }])
})

test('Marketing work order creation validates inspector names instead of user ID pairs', () => {
  const itemSizeId = '00000000-0000-4000-8000-000000000002'
  const quotation = { id: 'quotation-id', status: 'APPROVED', isActive: true, items: [{ itemSizeId }] }
  const values = { startDate: '2026-11-05', endDate: '2026-11-06', items: [{ itemSizeId, quantityInspection: '1', quantityMaintenance: '0' }] }
  const create = (inspectors) => quotationWorkOrderPayload({ ...values, inspectors }, quotation)
  for (const inspectors of [undefined, [], [' '], ['x'.repeat(256)], ['Budi', ' budi '], Array(101).fill('Budi'), [{ userId: 'old-id', name: 'Budi' }]]) {
    assert.throws(() => create(inspectors), /inspector/i)
  }
  const names = ['x'.repeat(255), ...Array.from({ length: 99 }, (_, index) => `Inspector ${index}`)]
  assert.deepEqual(create(names).inspectors, names)
})
