import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const tick = () => new Promise(resolve => setImmediate(resolve))
const response = marker => ({ data: { companies: [{ id: marker }], sizes: [{ id: marker }], pagination: { totalPages: 1 } } })

async function harness(file) {
  const source = (await readFile(new URL(`../akura-finance/src/modules/documents/${file}`, import.meta.url), 'utf8')).replaceAll('\r\n', '\n')
  const body = source.match(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[/)[1]
  const requests = []; const timers = new Map()
  const state = { loading: false, error: '', companies: [], data: null, pages: 1 }
  const request = params => new Promise((resolve, reject) => requests.push({ params, resolve, reject }))
  const effect = new Function('record', 'companyQuery', 'query', 'companyId', 'exclude', 'documentOptionService', 'setLoading', 'setError', 'setCompanies', 'setCompanyPages', 'setData', 'setQuery', 'setTimeout', 'clearTimeout', body)
  const h = { state, requests, run: () => effect(null, { search: 'Company', page: 1 }, { page: 1, limit: 20 }, 'company-id', 'selected-id', { companies: request, items: request }, value => { state.loading = value }, value => { state.error = value }, value => { state.companies = typeof value === 'function' ? value(state.companies) : value }, value => { state.pages = value }, value => { state.data = value }, () => {}, callback => { const key = {}; timers.set(key, callback); return key }, key => timers.delete(key)), flush: () => { for (const [key, callback] of timers) { timers.delete(key); callback() } } }
  return h
}

for (const file of ['DocumentForm.jsx', 'DocumentItemPicker.jsx']) {
  test(`${file}: closing during debounce prevents lookup requests`, async () => {
    const h = await harness(file)
    h.run()(); h.flush()
    assert.equal(h.requests.length, 0)
  })
  test(`${file}: old lookup responses and errors cannot replace the latest results`, async () => {
    const h = await harness(file)
    const cleanup = h.run(); h.flush(); cleanup()
    h.run(); h.flush()
    h.requests[1].resolve(response('latest')); await tick()
    const latest = structuredClone(h.state)
    h.requests[0].reject(new Error('Stale lookup')); await tick()
    assert.deepEqual(h.state, latest)
    assert.equal(h.state.loading, false)
    const close = h.run(); h.flush(); close()
    const closed = structuredClone(h.state)
    h.requests[2].resolve(response('closed')); await tick()
    assert.deepEqual(h.state, closed)
  })
  test(`${file}: current lookup failure exposes an error and releases loading`, async () => {
    const h = await harness(file)
    h.run(); h.flush()
    h.requests[0].reject(new Error('Access denied')); await tick()
    assert.equal(h.state.error, 'Access denied')
    assert.equal(h.state.loading, false)
    if (file === 'DocumentItemPicker.jsx') {
      assert.equal(h.requests[0].params.companyId, 'company-id')
      assert.equal(h.requests[0].params.exclude, 'selected-id')
    }
  })
}
