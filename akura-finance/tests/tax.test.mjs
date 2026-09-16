import assert from 'node:assert/strict'
import test from 'node:test'
import { canManageTaxes, taxPayload } from '../src/modules/tax/taxModel.js'

test('Tax writes require active ADMIN in FINANCE with a branch', () => {
  const user = { role: 'ADMIN', section: 'FINANCE', isActive: true, officeBranchId: 'branch' }
  assert.equal(canManageTaxes(user), true)
  for (const change of [{ role: 'USER' }, { role: 'APP_MANAGER' }, { section: 'MARKETING' }, { isActive: false }, { officeBranchId: null }]) assert.equal(canManageTaxes({ ...user, ...change }), false)
  assert.equal(canManageTaxes(), false)
})

test('Tax payload preserves decimals and only sends editable fields', () => {
  assert.deepEqual(taxPayload({ percentage: '11.25', effectiveFrom: '2026-10-01', officeBranchId: 'ignored' }), { percentage: '11.25', effectiveFrom: '2026-10-01' })
  for (const percentage of [0, 100, '0.01']) assert.doesNotThrow(() => taxPayload({ percentage, effectiveFrom: '2026-10-01' }))
  for (const percentage of ['', null, -1, 101, '1.001', '1e1', NaN]) assert.throws(() => taxPayload({ percentage, effectiveFrom: '2026-10-01' }), /percentage/)
})

test('Tax dates must be real calendar dates after the latest scheduled period', () => {
  for (const effectiveFrom of ['', '2026-02-30', '2026-13-01', '2026-9-01']) assert.throws(() => taxPayload({ percentage: 11, effectiveFrom }), /date/)
  for (const effectiveFrom of ['2026-09-01', '2026-10-01']) assert.throws(() => taxPayload({ percentage: 11, effectiveFrom }, '2026-10-01T00:00:00.000Z'), /after/)
  assert.doesNotThrow(() => taxPayload({ percentage: 11, effectiveFrom: '2026-10-02' }, '2026-10-01T00:00:00.000Z'))
})
