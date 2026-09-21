import assert from 'node:assert/strict'
import test from 'node:test'
import { canCreateContractPrice, canEditContractPrice, canDeleteContractPrice } from '../src/modules/company/contractAccess.js'
import { businessDate, canReceiveContractPrices, contractPricePayload, contractUploadTargets, selectImportContract } from '../src/modules/company/contractPriceModel.js'

test('Create and update price permissions follow contract status and Marketing role', () => {
  for (const role of ['USER', 'ADMIN', 'APP_MANAGER']) {
    for (const section of ['MARKETING', 'FINANCE', undefined]) {
      for (const status of ['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED', 'TERMINATED', 'REVISED', 'UNKNOWN']) {
        const contract = { status, effectiveUntil: '2000-01-01' }
        const expected = section === 'MARKETING' && (['DRAFT', 'REJECTED'].includes(status)
          || (role === 'ADMIN' && ['SUBMITTED', 'APPROVED'].includes(status)))
        assert.equal(canCreateContractPrice({ role, section }, contract), expected, `${role}/${section}/${status} create`)
        assert.equal(canEditContractPrice({ role, section }, contract), expected, `${role}/${section}/${status} update`)
        assert.equal(canDeleteContractPrice({ role, section }, contract), expected, `${role}/${section}/${status} delete`)
        assert.equal(canDeleteContractPrice({ role, section }, { ...contract, isDeleted: true }), false)
        assert.equal(canCreateContractPrice({ role, section }, { ...contract, isDeleted: true }), false)
        assert.equal(canEditContractPrice({ role, section }, { ...contract, isDeleted: true }), false)
      }
    }
  }
  assert.equal(canCreateContractPrice(), false)
  assert.equal(canEditContractPrice(), false)
  assert.equal(canCreateContractPrice({ role: 'ADMIN', section: 'MARKETING' }), false)
})

test('Upload targets current APPROVED contract, otherwise earliest future, with an exclusive end date', () => {
  const today = '2026-09-18'
  const contract = (id, effectiveFrom, extra = {}) => ({ id, effectiveFrom, effectiveUntil: '2027-01-01', status: 'APPROVED', ...extra })
  const current = contract('current', '2026-09-01')
  const future = contract('future', '2026-10-01')
  const invalid = [contract('pending', '2026-01-01', { status: 'DRAFT' }), contract('ended', '2026-01-01', { effectiveUntil: today }), contract('inactive', '2026-01-01', { status: 'TERMINATED' })]
  assert.equal(selectImportContract([...invalid, future, current], today), current)
  assert.equal(selectImportContract([...invalid, contract('later', '2026-11-01'), future], today), future)
  assert.equal(selectImportContract(invalid, today), null)
  assert.equal(canReceiveContractPrices(future, today), true)
  assert.equal(businessDate(new Date('2026-09-17T17:00:00Z')), today)
  assert.equal(businessDate(new Date('2026-09-17T16:59:59Z')), '2026-09-17')
})

test('Excel upload offers requested drafts alongside the backward-compatible approved target', () => {
  const today = '2026-09-21'
  const contract = (id, status, extra = {}) => ({ id, status, effectiveFrom: '2026-09-01', effectiveUntil: '2027-01-01', ...extra })
  const draft = contract('draft', 'DRAFT', { effectiveUntil: '2026-09-01' })
  const revision = contract('revision', 'DRAFT', { revisionOfId: 'current' })
  const current = contract('current', 'APPROVED')
  const future = contract('future', 'APPROVED', { effectiveFrom: '2026-10-01' })
  const excluded = ['SUBMITTED', 'REJECTED', 'TERMINATED', 'REVISED'].map((status) => contract(status, status))
  excluded.push(contract('deleted', 'DRAFT', { isDeleted: true }), contract('ended', 'APPROVED', { effectiveUntil: today }))
  assert.deepEqual(contractUploadTargets([...excluded, future, current, draft, revision], today), [draft, revision, current])
  assert.deepEqual(contractUploadTargets([...excluded, future, draft], today), [draft, future])
  assert.deepEqual(contractUploadTargets(excluded, today), [])
  assert.equal(canReceiveContractPrices(draft), true, 'Single-price creation now also supports DRAFT')
})

test('Price payload preserves zero and large decimals, requires maintenance when applicable, and uses price version on PATCH', () => {
  assert.deepEqual(contractPricePayload({ priceService: 0 }, { contractId: 'contract' }), { contractId: 'contract', priceService: '0', priceMaintenance: null })
  assert.deepEqual(contractPricePayload({ priceService: '9999999999999999.99', priceMaintenance: '0.01' }, { version: 7, hasMaintenance: true }),
    { version: 7, priceService: '9999999999999999.99', priceMaintenance: '0.01' })
  assert.throws(() => contractPricePayload({ priceService: '1' }, { contractId: 'contract', hasMaintenance: true }))
  for (const priceService of [null, '', -1, '1.234', 'Rp 100', '1,000', true]) assert.throws(() => contractPricePayload({ priceService }, { version: 0 }))
})
