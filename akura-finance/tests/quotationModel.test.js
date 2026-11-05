import assert from 'node:assert/strict'
import test from 'node:test'
import { quotationTerms } from '../src/modules/quotation/quotationModel.js'

test('quotation detail includes all document terms with multiline values intact', () => {
  const record = {
    subject: 'Inspection', termOfPayment: '30 days', validity: '14 days',
    supplyAkura: 'Inspectors\nEquipment', supplyCustomer: 'Access\nPower', location: 'Jakarta',
    jobStart: 'After purchase order approval', accomplished: 'First phase\nSecond phase',
    deliveryReports: 'Digital copy\nSigned copy', deliveryInvoice: `Finance department\n${'x'.repeat(4981)}`,
    subTotal: '100.00', taxAmount: '11.00', total: '111.00',
  }
  const original = structuredClone(record)
  assert.deepEqual(quotationTerms(record), [
    ['Subject', record.subject], ['Term of Payment', record.termOfPayment], ['Validity', record.validity],
    ['Akura Supply', record.supplyAkura], ['Customer Supply', record.supplyCustomer], ['Location', record.location],
    ['Job Start', record.jobStart], ['Completion Time', record.accomplished],
    ['Delivery Reports', record.deliveryReports], ['Delivery Invoice', record.deliveryInvoice],
  ])
  assert.deepEqual(record, original)
})

test('quotation detail presents empty or missing terms as a placeholder', () => {
  const terms = quotationTerms({ jobStart: null, deliveryInvoice: '' })
  assert.equal(terms.find(([label]) => label === 'Job Start')[1], '-')
  assert.equal(terms.find(([label]) => label === 'Delivery Invoice')[1], '-')
  assert.ok(terms.every(([, value]) => value === '-'))
})
