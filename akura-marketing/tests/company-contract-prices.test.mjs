import assert from 'node:assert/strict'
import test from 'node:test'
import { canCreateContractPrice, canEditContractPrice } from '../src/modules/company/contractAccess.js'
import { businessDate, canReceiveContractPrices, contractPricePayload, selectImportContract } from '../src/modules/company/contractPriceModel.js'

test('Single price creation requires Marketing; editing requires both ADMIN and Marketing', () => {
  for (const role of ['USER', 'ADMIN', 'APP_MANAGER']) {
    for (const section of ['MARKETING', 'FINANCE', undefined]) {
      assert.equal(canCreateContractPrice({ role, section }), section === 'MARKETING')
      assert.equal(canEditContractPrice({ role, section }), role === 'ADMIN' && section === 'MARKETING')
    }
  }
  assert.equal(canCreateContractPrice(), false)
  assert.equal(canEditContractPrice(), false)
})

test('Upload targets current ACTIVE contract, otherwise earliest future, with an exclusive end date', () => {
  const today = '2026-09-18'
  const contract = (id, effectiveFrom, extra = {}) => ({ id, effectiveFrom, effectiveUntil: '2027-01-01', status: 'ACTIVE', isActive: true, ...extra })
  const current = contract('current', '2026-09-01')
  const future = contract('future', '2026-10-01')
  const invalid = [contract('pending', '2026-01-01', { status: 'CREATE' }), contract('ended', '2026-01-01', { effectiveUntil: today }), contract('inactive', '2026-01-01', { isActive: false })]
  assert.equal(selectImportContract([...invalid, future, current], today), current)
  assert.equal(selectImportContract([...invalid, contract('later', '2026-11-01'), future], today), future)
  assert.equal(selectImportContract(invalid, today), null)
  assert.equal(canReceiveContractPrices(future, today), true)
  assert.equal(businessDate(new Date('2026-09-17T17:00:00Z')), today)
  assert.equal(businessDate(new Date('2026-09-17T16:59:59Z')), '2026-09-17')
})

test('Price payload preserves zero and large decimals, requires maintenance when applicable, and uses price version on PATCH', () => {
  assert.deepEqual(contractPricePayload({ priceService: 0 }, { contractId: 'contract' }), { contractId: 'contract', priceService: '0', priceMaintenance: null })
  assert.deepEqual(contractPricePayload({ priceService: '9999999999999999.99', priceMaintenance: '0.01' }, { version: 7, hasMaintenance: true }),
    { version: 7, priceService: '9999999999999999.99', priceMaintenance: '0.01' })
  assert.throws(() => contractPricePayload({ priceService: '1' }, { contractId: 'contract', hasMaintenance: true }))
  for (const priceService of [null, '', -1, '1.234', 'Rp 100', '1,000', true]) assert.throws(() => contractPricePayload({ priceService }, { version: 0 }))
})
