import assert from 'node:assert/strict'
import test from 'node:test'
import { decimalPrice, formatPriceInput, parsePriceInput } from '../src/components/global/priceFormat.js'
import { canAdministerContracts, canApproveContract } from '../src/modules/company/contractAccess.js'

test('Catalog price input preserves fractional and large decimal strings without rounding', () => {
  for (const value of ['0', '0.01', '100.25', '9999999999999999.99']) {
    assert.equal(parsePriceInput(formatPriceInput(value)), value)
    assert.equal(decimalPrice(value), value)
  }
  assert.equal(formatPriceInput('1234.50'), '1.234,50')
  assert.equal(parsePriceInput('1.234,50'), '1234.50')
  assert.equal(decimalPrice(null), '')
})

test('Only admin roles approve active CREATE contracts', () => {
  for (const role of ['ADMIN', 'APP_MANAGER']) {
    assert.equal(canAdministerContracts({ role }), true)
    assert.equal(canApproveContract({ role }, { status: 'CREATE', isActive: true }), true)
    for (const status of ['ACTIVE', 'EXPIRED', 'TERMINATED']) assert.equal(canApproveContract({ role }, { status, isActive: true }), false)
    assert.equal(canApproveContract({ role }, { status: 'CREATE', isActive: false }), false)
  }
  assert.equal(canApproveContract({ role: 'USER' }, { status: 'CREATE', isActive: true }), false)
  assert.equal(canAdministerContracts(), false)
})
