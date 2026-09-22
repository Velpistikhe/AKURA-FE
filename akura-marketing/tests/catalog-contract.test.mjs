import assert from 'node:assert/strict'
import test from 'node:test'
import { decimalPrice, formatPriceInput, parsePriceInput } from '../src/components/global/priceFormat.js'
import { CONTRACT_STATUSES, canSubmitContract, canRejectContract, canCancelContract, canManageCompanyContracts, blocksContractCreation, canAdministerContracts, canApproveContract, canUpdateContract, canReviseContract, canTerminateContract } from '../src/modules/company/contractAccess.js'
import { activeScopes, canViewInactiveCatalog } from '../src/modules/catalogAccess.js'

test('Inactive catalog visibility is reserved for ADMIN', () => {
  assert.equal(canViewInactiveCatalog({ role: 'ADMIN' }), true)
  for (const user of [undefined, { role: 'APP_MANAGER' }, { role: 'USER', section: 'MARKETING' }]) {
    assert.equal(canViewInactiveCatalog(user), false)
  }
})

test('Scope lists use revoked rather than the catalog isActive flag', () => {
  const scopes = [{ id: 'active', revoked: false }, { id: 'deleted', revoked: true, isActive: true }]
  assert.deepEqual(activeScopes(scopes), [scopes[0]])
  assert.deepEqual(activeScopes(), [])
})

test('Catalog price input preserves fractional and large decimal strings without rounding', () => {
  for (const value of ['0', '0.01', '100.25', '9999999999999999.99']) {
    assert.equal(parsePriceInput(formatPriceInput(value)), value)
    assert.equal(decimalPrice(value), value)
  }
  assert.equal(formatPriceInput('1234.50'), '1.234,50')
  assert.equal(parsePriceInput('1.234,50'), '1234.50')
  assert.equal(decimalPrice(null), '')
})

test('Contract actions enforce lifecycle and Marketing roles', () => {
  for (const role of ['ADMIN', 'APP_MANAGER', 'USER']) {
    for (const section of ['MARKETING', 'FINANCE', undefined]) {
      const user = { role, section }
      const marketing = section === 'MARKETING'
      const admin = role === 'ADMIN' && marketing
      assert.equal(canAdministerContracts(user), admin)
      assert.equal(canManageCompanyContracts(user), marketing && ['USER', 'ADMIN'].includes(role))
      for (const status of CONTRACT_STATUSES) {
        const contract = { status, effectiveUntil: '2027-01-01' }
        assert.equal(canApproveContract(user, contract), admin && status === 'SUBMITTED')
        assert.equal(canRejectContract(user, contract), admin && status === 'SUBMITTED')
        assert.equal(canSubmitContract(user, contract), marketing && ['USER', 'ADMIN'].includes(role) && ['DRAFT', 'REJECTED'].includes(status))
        assert.equal(canUpdateContract(user, contract), marketing && (['DRAFT', 'REJECTED'].includes(status) || (admin && status === 'APPROVED')))
        assert.equal(canCancelContract(user, contract), marketing && ['DRAFT', 'REJECTED'].includes(status))
        assert.equal(canTerminateContract(user, contract), admin && status === 'APPROVED')
        assert.equal(canReviseContract(user, contract, '2026-09-20'), marketing && status === 'APPROVED')
        for (const action of [canApproveContract, canRejectContract, canSubmitContract, canUpdateContract, canCancelContract, canTerminateContract, canReviseContract]) {
          assert.equal(action(user, { ...contract, isDeleted: true }), false)
          assert.equal(action(user, null), false)
        }
      }
    }
  }
})

test('Draft and rejected contracts block creation; submitted, approved and deleted records do not', () => {
  for (const status of CONTRACT_STATUSES) {
    assert.equal(blocksContractCreation({ status }), ['DRAFT', 'REJECTED'].includes(status))
    assert.equal(blocksContractCreation({ status, isDeleted: true }), false)
  }
})
