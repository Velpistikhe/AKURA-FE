import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Exercise the actual effect callbacks without mounting the federated UI.
const source = await readFile(new URL('../akura-finance/src/modules/documents/DocumentPage.jsx', import.meta.url), 'utf8')
const effects = [...source.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[/g)].map(match => match[1])
const tick = () => new Promise(resolve => setImmediate(resolve))
const response = marker => ({ data: { documents: [marker], history: [marker], pagination: { totalPages: 1 } } })

function harness(index) {
  const requests = []
  const state = { data: null, loading: false, error: '', pages: [] }
  const ref = { current: 0 }
  const service = { [index === 0 ? 'list' : 'history']: (...args) => new Promise((resolve, reject) => requests.push({ args, resolve, reject })) }
  const setData = value => { state.data = value }
  const setLoading = value => { state.loading = value }
  const setError = value => { state.error = value }
  const names = ['service', 'query', 'history', 'historyPage', 'listRequestRef', 'historyRequestRef', 'setData', 'setLoading', 'setError', 'setQuery', 'setHistoryData', 'setHistoryLoading', 'setHistoryError']
  const effect = new Function(...names, effects[index])
  return { state, requests, run: () => effect(service, { page: 2 }, { id: 'document' }, 1, ref, ref, setData, setLoading, setError, value => state.pages.push(value), setData, setLoading, setError) }
}

for (const [index, label] of ['document list', 'document history'].entries()) {
  test(`${label}: StrictMode cleanup lets requests finish and only latest response updates state`, async () => {
    const h = harness(index)
    const cleanup = h.run()
    cleanup()
    h.run()
    assert.equal(h.requests.length, 2)
    for (const request of h.requests) assert.equal(request.args.some(arg => arg?.signal), false)
    h.requests[1].resolve(response('latest')); await tick()
    const latest = structuredClone(h.state)
    h.requests[0].resolve({ data: { documents: [], pagination: { totalPages: 1 } } }); await tick()
    assert.deepEqual(h.state, latest)
    assert.equal(h.state.loading, false)
  })

  test(`${label}: stale failures cannot clear data or stop latest loading`, async () => {
    const h = harness(index)
    h.run()(); const cleanup = h.run()
    h.requests[0].reject(new Error('Old request failed')); await tick()
    assert.equal(h.state.error, '')
    assert.equal(h.state.loading, true)
    h.requests[1].reject(new Error('Latest request failed')); await tick()
    assert.equal(h.state.error, 'Latest request failed')
    assert.equal(h.state.loading, false)
    cleanup()
  })

  test(`${label}: unmount prevents pending responses from updating state`, async () => {
    const h = harness(index)
    const cleanup = h.run()
    cleanup()
    const before = structuredClone(h.state)
    h.requests[0].resolve(response('unmounted')); await tick()
    assert.deepEqual(h.state, before)
  })
}
