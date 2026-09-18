import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSizeHistory } from '../src/modules/item/itemHistoryModel.js'

test('Size history excludes price audits and price-triggered size updates across pages', async () => {
  const size = { entityType: 'ITEM_SIZE', entityId: 'size-1', action: 'CREATE', changes: [{ field: 'size', after: '2 inch' }] }
  const calls = []
  const result = await loadSizeHistory('size-1', async (id, query) => {
    calls.push({ id, ...query })
    return { data: { history: query.page === 1 ? [
      { ...size, entityType: 'ITEM_PRICE' },
      { ...size, entityType: 'COMPANY_CONTRACT_PRICE' },
      { ...size, action: 'PRICE_UPDATE' },
      { ...size, action: 'CHILD_UPDATE' },
      { ...size, entityId: 'other-size' },
    ] : [size, { ...size, action: 'DEACTIVATE' }], pagination: { totalPages: 2 } } }
  })
  assert.deepEqual(calls, [{ id: 'size-1', page: 1, limit: 100 }, { id: 'size-1', page: 2, limit: 100 }])
  assert.deepEqual(result.history, [size, { ...size, action: 'DEACTIVATE' }])
  assert.equal(result.pagination.total, 2)
})

test('Empty size history has zero total and cancelled loads stop requesting pages', async () => {
  assert.deepEqual(await loadSizeHistory('size-1', async () => ({ data: { history: [], pagination: { totalPages: 0 } } })), { history: [], pagination: { total: 0 } })
  let calls = 0
  assert.equal(await loadSizeHistory('size-1', async () => {
    calls++
    return { data: { history: [], pagination: { totalPages: 10 } } }
  }, () => false), null)
  assert.equal(calls, 1)
})

test('Failed size history reads remain errors rather than partial success', async () => {
  await assert.rejects(loadSizeHistory('size-1', async () => { throw new Error('Network error') }), /Network error/)
})
