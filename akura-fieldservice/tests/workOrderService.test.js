import assert from 'node:assert/strict'
import { after, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  configFile: false,
  envDir: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false },
})
after(() => server.close())
const { workOrderService } = await server.ssrLoadModule('/src/services/workOrderService.js')
const { watchWorkOrderSync } = await server.ssrLoadModule('/src/modules/work-order/workOrderSyncModel.js')
const branchId = '00000000-0000-4000-8000-000000000001'
test('sync reads the Field Service array envelope with top-level pagination and cancellation', async (context) => {
  const response = { data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } }
  const controller = new AbortController()
  const calls = []
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return { ok: true, status: 200, json: async () => response }
  })
  context.after(() => fetchMock.mock.restore())
  const result = await workOrderService.sync(branchId, { page: 2, limit: 10, officeBranchId: 'other-branch' }, { signal: controller.signal })
  assert.equal(calls[0].url, `http://localhost:5005/work-orders/${branchId}/sync?page=2&limit=10`)
  assert.equal(calls[0].options.signal, controller.signal)
  assert.equal(calls[0].options.method, undefined)
  assert.equal(calls[0].options.body, undefined)
  assert.deepEqual(result, response)
})

const settle = () => new Promise((resolve) => setImmediate(resolve))
const syncResponse = (deliveryStatus) => ({
  data: deliveryStatus ? [{ eventId: 'event-id', delivery: { id: 'delivery-id', deliveryStatus } }] : [],
  pagination: { page: 1, limit: 20, total: deliveryStatus ? 1 : 0, totalPages: deliveryStatus ? 1 : 0 },
})

test('sync polling follows pending and retrying deliveries and stops after acknowledgement', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const states = ['PENDING', 'RETRYING', 'DELIVERED']
  const received = []
  const fetchMock = mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.method, undefined, 'polling must never create or retry a write')
    return { ok: true, status: 200, json: async () => syncResponse(states.shift()) }
  })
  context.after(() => fetchMock.mock.restore())
  const stop = watchWorkOrderSync(branchId, {}, { onData: (result) => received.push(result.data[0].delivery.deliveryStatus), onError: assert.fail })
  context.after(stop)
  await settle()
  assert.deepEqual(received, ['PENDING'])
  for (let index = 0; index < 2; index += 1) { context.mock.timers.tick(5000); await settle() }
  assert.deepEqual(received, ['PENDING', 'RETRYING', 'DELIVERED'])
  context.mock.timers.tick(60000)
  await settle()
  assert.equal(fetchMock.mock.callCount(), 3)
})

test('sync cleanup cancels an in-flight request and ignores its late result', async (context) => {
  let finish
  let signal
  const fetchMock = mock.method(globalThis, 'fetch', (_url, options) => {
    signal = options.signal
    return new Promise((resolve) => { finish = resolve })
  })
  context.after(() => fetchMock.mock.restore())
  const stop = watchWorkOrderSync(branchId, {}, { onData: () => assert.fail('Late data after close'), onError: () => assert.fail('Late error after close') })
  stop()
  assert.equal(signal.aborted, true)
  finish({ ok: true, status: 200, json: async () => syncResponse('PENDING') })
  await settle()
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('sync cleanup removes a scheduled poll and empty standalone history does not poll', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const responses = [syncResponse('PENDING'), syncResponse()]
  const fetchMock = mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => responses.shift() }))
  context.after(() => fetchMock.mock.restore())
  const stop = watchWorkOrderSync(branchId, {}, { onData: () => {}, onError: assert.fail })
  await settle()
  stop()
  context.mock.timers.tick(60000)
  await settle()
  assert.equal(fetchMock.mock.callCount(), 1)
  const stopEmpty = watchWorkOrderSync(branchId, {}, { onData: (result) => assert.deepEqual(result.data, []), onError: assert.fail })
  context.after(stopEmpty)
  await settle()
  context.mock.timers.tick(60000)
  await settle()
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('sync polling never overlaps slow requests', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let finish
  const fetchMock = mock.method(globalThis, 'fetch', () => new Promise((resolve) => { finish = resolve }))
  context.after(() => fetchMock.mock.restore())
  const stop = watchWorkOrderSync(branchId, {}, { onData: () => {}, onError: assert.fail })
  context.after(stop)
  context.mock.timers.tick(60000)
  assert.equal(fetchMock.mock.callCount(), 1)
  finish({ ok: true, status: 200, json: async () => syncResponse('DELIVERED') })
  await settle()
  context.mock.timers.tick(60000)
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('sync errors and malformed envelopes are reported without repeating creation or hiding failure', async (context) => {
  for (const status of [403, 404, 503, 200]) {
    const errors = []
    const fetchMock = mock.method(globalThis, 'fetch', async () => ({
      ok: status === 200, status,
      json: async () => status === 200 ? { data: { sync: [] } } : { message: 'Sync unavailable' },
    }))
    const stop = watchWorkOrderSync(branchId, {}, { onData: () => assert.fail('Invalid response accepted'), onError: (error) => errors.push(error) })
    try {
      await settle()
      assert.equal(fetchMock.mock.callCount(), 1)
      assert.equal(errors.length, 1)
      assert.match(errors[0].message, status === 200 ? /Invalid work order/ : /Sync unavailable/)
    } finally { stop(); fetchMock.mock.restore() }
  }
})

test('standalone and quotation creation post to their separate Field Service endpoints', async (context) => {
  const calls = []
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return { ok: true, status: 201, json: async () => ({ data: { id: 'work-order-id' } }) }
  })
  context.after(() => fetchMock.mock.restore())
  const company = { companyId: branchId, subject: 'Site inspection', officialReport: false,
    dailyReport: '2026-11-05', officialReportDelivery: '2026-11-06', dailyReportDelivery: '2026-11-06',
    poNumber: 'PO-001', poDate: '2026-11-01', startDate: '2026-11-05', inspectors: ['Branch Inspector'],
    items: [{ itemSizeId: '00000000-0000-4000-8000-000000000002', quantityInspection: 2.125, quantityMaintenance: 0 }] }
  const quotation = { quotationId: branchId, startDate: company.startDate, endDate: '2026-11-06', inspectors: company.inspectors, items: company.items }
  await workOrderService.create(company)
  await workOrderService.createFromQuotation(quotation)
  assert.deepEqual(calls.map(({ url }) => url), ['http://localhost:5005/work-orders', 'http://localhost:5005/work-orders/from-quotation'])
  assert.deepEqual(calls.map(({ options }) => JSON.parse(options.body)), [company, quotation])
  assert.ok(calls.every(({ options }) => options.method === 'POST' && options.credentials === 'include'))
})

test('quotation options read every approved Marketing page and exclude existing work orders', async (context) => {
  const calls = []
  const eligible = { id: branchId, no: 12, isActive: true, status: 'APPROVED', hasWorkOrder: false }
  const next = { ...eligible, id: 'next-quotation' }
  const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
    calls.push(new URL(url))
    const quotations = calls.length === 1 ? [eligible, { ...eligible, hasWorkOrder: true },
      { ...eligible, workOrderId: 'existing-work-order' }, { ...eligible, isActive: false }, { ...eligible, status: 'REVISED' }] : [next]
    return { ok: true, status: 200, json: async () => ({ data: { quotations, pagination: { totalPages: 2 } } }) }
  })
  context.after(() => fetchMock.mock.restore())
  assert.deepEqual(await workOrderService.quotations(), { data: { quotations: [eligible, next] } })
  assert.equal(calls.length, 2)
  calls.forEach((url, index) => {
    assert.equal(url.origin + url.pathname, 'http://localhost:5003/quotations')
    assert.deepEqual(Object.fromEntries(url.searchParams), { page: String(index + 1), limit: '100', status: 'APPROVED', isActive: 'true' })
  })
})

test('quotation options reject malformed responses and later-page failures without returning partial options', async (context) => {
  let calls = 0
  let malformed = true
  const fetchMock = mock.method(globalThis, 'fetch', async () => {
    calls += 1
    if (malformed) return { ok: true, status: 200, json: async () => ({ data: {} }) }
    if (calls === 1) return { ok: true, status: 200, json: async () => ({ data: { quotations: [], pagination: { totalPages: 2 } } }) }
    return { ok: false, status: 503, json: async () => ({ message: 'Marketing unavailable' }) }
  })
  context.after(() => fetchMock.mock.restore())
  await assert.rejects(workOrderService.quotations(), /Invalid quotation directory/)
  assert.equal(calls, 1)
  malformed = false
  calls = 0
  await assert.rejects(workOrderService.quotations(), /Marketing unavailable/)
  assert.equal(calls, 2)
})

test('quotation items use the Marketing detail endpoint and preserve its response envelope', async (context) => {
  const response = { data: { id: branchId, isActive: true, status: 'APPROVED', items: [{ itemSizeId: 'item-size-id' }] } }
  const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, `http://localhost:5003/quotations/${branchId}`)
    return { ok: true, status: 200, json: async () => response }
  })
  context.after(() => fetchMock.mock.restore())
  assert.deepEqual(await workOrderService.quotationItems(branchId), response)
})

test('standalone options use bounded company search and catalog pagination without branch overrides', async (context) => {
  const urls = []
  const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
    urls.push(new URL(url))
    return { ok: true, status: 200, json: async () => ({ data: {} }) }
  })
  context.after(() => fetchMock.mock.restore())
  await workOrderService.companies({ search: 'Branch Company', page: 2 })
  await workOrderService.itemSizes({ itemName: 'Pipe', page: 3, limit: 50 })
  assert.deepEqual(urls.map((url) => url.origin + url.pathname), ['http://localhost:5003/companies', 'http://localhost:5003/items/sizes'])
  assert.deepEqual(Object.fromEntries(urls[0].searchParams), { page: '2', limit: '20', search: 'Branch Company' })
  assert.deepEqual(Object.fromEntries(urls[1].searchParams), { page: '3', limit: '50', itemName: 'Pipe' })
})

test('creation propagates conflicts and unavailable services without repeating writes', async () => {
  for (const method of ['create', 'createFromQuotation']) {
    for (const status of [409, 503]) {
      const fetchMock = mock.method(globalThis, 'fetch', async () => ({ ok: false, status, json: async () => ({ message: 'Creation rejected' }) }))
      try {
        await assert.rejects(workOrderService[method]({}), { status, message: 'Creation rejected' })
        assert.equal(fetchMock.mock.callCount(), 1)
      } finally { fetchMock.mock.restore() }
    }
  }
})

test('inspector directory reads every Auth page with active Field Service and branch filters', async (context) => {
  const users = [
    { id: 'one', firstName: 'Budi', lastName: 'Santoso', branch: 'Jakarta' },
    { id: 'two', firstName: 'Siti', lastName: '', branch: 'Jakarta' },
  ]
  const calls = []
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    const parsed = new URL(url)
    calls.push({ url: parsed, options })
    const page = Number(parsed.searchParams.get('page'))
    return { ok: true, status: 200, json: async () => ({ data: { users: [users[page - 1]], pagination: { page, totalPages: 2 } } }) }
  })
  context.after(() => fetchMock.mock.restore())

  assert.deepEqual(await workOrderService.inspectors(branchId), users)
  assert.equal(calls.length, 2)
  calls.forEach(({ url, options }, index) => {
    assert.equal(url.pathname, '/api/v1/auth/users')
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      page: String(index + 1), limit: '100', officeBranchId: branchId,
      isActive: 'true', section: 'FIELD_SERVICE', sortBy: 'firstName', sortOrder: 'asc',
    })
    assert.equal(options.credentials, 'include')
  })
})

test('inspector directory refuses an unscoped lookup before making a request', async (context) => {
  const fetchMock = mock.method(globalThis, 'fetch', () => assert.fail('Unscoped user request'))
  context.after(() => fetchMock.mock.restore())
  await assert.rejects(workOrderService.inspectors(), /assigned branch/)
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('inspector directory propagates later-page failures instead of returning a partial list', async (context) => {
  const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
    const firstPage = new URL(url).searchParams.get('page') === '1'
    return {
      ok: firstPage, status: firstPage ? 200 : 503,
      json: async () => firstPage
        ? { data: { users: [{ firstName: 'Budi' }], pagination: { totalPages: 2 } } }
        : { message: 'Directory unavailable' },
    }
  })
  context.after(() => fetchMock.mock.restore())
  await assert.rejects(workOrderService.inspectors(branchId), { message: 'Directory unavailable', status: 503 })
})

test('inspector directory rejects an invalid response instead of hiding missing users', async (context) => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => ({ data: { users: [] } }) }))
  context.after(() => fetchMock.mock.restore())
  await assert.rejects(workOrderService.inspectors(branchId), /Invalid inspector directory response/)
})
