import assert from 'node:assert/strict'
import test from 'node:test'
import { loadQuotationHistory } from '../src/modules/quotation/quotationHistoryModel.js'

const query = { page: 1, limit: 1, action: 'UPDATE', sortBy: 'version', sortOrder: 'desc' }
const pages = [
  [{ id: 'a', version: 12, createdAt: '2026-09-27T12:00:00Z', createdByName: 'Other' }],
  [{ id: 'b', version: 2, createdAt: '2026-09-27T11:00:00Z', createdBy: { name: 'Admin Marketing' } },
    { id: 'c', version: 1, createdAt: '2026-09-26T11:00:00Z', createdByName: 'Admin Marketing' }],
]

test('History column filters search all pages and combine version, date and author', async () => {
  const calls = []
  const read = async (id, params) => {
    calls.push({ id, ...params })
    return { data: { history: pages[params.page - 1], pagination: { totalPages: 2 } } }
  }
  const result = await loadQuotationHistory('quote', { ...query, versionFilter: '2', dateFilter: '2026-09-27', nameFilter: 'admin' }, read)
  assert.deepEqual(result.history.map((row) => row.id), ['b'])
  assert.equal(result.pagination.total, 1)
  assert.equal(calls.length, 2)
  assert.ok(calls.every((call) => call.limit === 100 && call.action === 'UPDATE' && call.sortOrder === 'desc'))
  const secondPage = await loadQuotationHistory('quote', { ...query, page: 2, nameFilter: 'admin' }, read)
  assert.deepEqual(secondPage.history.map((row) => row.id), ['c'])
  assert.equal(secondPage.pagination.total, 2)
})

test('History without local filters uses server pagination; cancelled loads stop', async () => {
  const response = { history: pages[0], pagination: { total: 3 } }
  const result = await loadQuotationHistory('quote', query, async (_, params) => {
    assert.deepEqual(params, query)
    return { data: response }
  })
  assert.equal(result, response)
  let calls = 0
  assert.equal(await loadQuotationHistory('quote', { ...query, nameFilter: 'admin' }, async () => {
    calls++
    return { data: { history: pages[0], pagination: { totalPages: 2 } } }
  }, () => false), null)
  assert.equal(calls, 1)
})
