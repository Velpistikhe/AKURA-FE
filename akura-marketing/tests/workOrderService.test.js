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

test('quotation creation posts explicit quantities to Field Service instead of the old Marketing route', async (context) => {
  const payload = { quotationId: branchId, startDate: '2026-11-05', endDate: '2026-11-06', inspectors: ['Budi Santoso'],
    items: [{ itemSizeId: '00000000-0000-4000-8000-000000000002', quantityInspection: 2.125, quantityMaintenance: 0 }] }
  const calls = []
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return { ok: true, status: 201, json: async () => ({ data: { id: 'work-order-id', number: 'WO/2026/000001' } }) }
  })
  context.after(() => fetchMock.mock.restore())
  const result = await workOrderService.createFromQuotation(payload)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://localhost:5005/work-orders/from-quotation')
  assert.equal(calls[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].options.body), payload)
  assert.equal(calls[0].options.credentials, 'include')
  assert.equal(result.data.number, 'WO/2026/000001')
})

test('creation propagates conflict and unavailable-service responses without automatically repeating a write', async () => {
  for (const status of [409, 503]) {
    const fetchMock = mock.method(globalThis, 'fetch', async () => ({ ok: false, status, json: async () => ({ message: 'Creation rejected' }) }))
    try {
      await assert.rejects(workOrderService.createFromQuotation({}), { status, message: 'Creation rejected' })
      assert.equal(fetchMock.mock.callCount(), 1)
    } finally { fetchMock.mock.restore() }
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
