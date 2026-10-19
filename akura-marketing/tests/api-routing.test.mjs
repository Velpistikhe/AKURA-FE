import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = (await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env.VITE_MARKETING_BASE_URL', 'undefined')
  .replaceAll('import.meta.env.VITE_FIELDSERVICE_BASE_URL', 'undefined')
  .replaceAll('import.meta.env.VITE_AUTH_BASE_URL', 'undefined')
  .replaceAll('import.meta.env.VITE_AKURA_SHELL_URL', 'undefined')
  .replaceAll('import.meta.env.PROD', 'false')

let instance = 0

async function loadApi() {
  const instrumented = `// api-routing-${++instance}
    const calls = [];
    const fetch = async (url, options = {}) => {
      calls.push({ url, ...options })
      return { ok: true, status: 200, json: async () => ({ success: true }) }
    };
    export { calls };
    ${source}`
  const module = await import(`data:text/javascript;base64,${Buffer.from(instrumented).toString('base64')}`)
  return { apiRequest: module.apiRequest, setAccessToken: module.setAccessToken, calls: module.calls }
}

test('Development defaults: Marketing paths use the local Marketing service', async () => {
  const { apiRequest, calls } = await loadApi()
  await apiRequest('/marketing/quotations?page=1&limit=20')
  await apiRequest('/marketing/company-contracts')
  assert.equal(calls[0].url, 'http://localhost:5003/marketing/quotations?page=1&limit=20')
  assert.equal(calls[1].url, 'http://localhost:5003/marketing/company-contracts')
})

test('Development defaults: Field Service paths use the local Field Service service', async () => {
  const { apiRequest, calls } = await loadApi()
  await apiRequest('/fieldservice/work-orders?page=1&limit=20')
  await apiRequest('/fieldservice/options/inspectors')
  assert.equal(calls[0].url, 'http://localhost:5005/fieldservice/work-orders?page=1&limit=20')
  assert.equal(calls[1].url, 'http://localhost:5005/fieldservice/options/inspectors')
})

test('Development defaults: auth and cross-module paths use the issuing gateway', async () => {
  const { apiRequest, calls } = await loadApi()
  await apiRequest('/finance/invoices', { method: 'POST', body: '{}' })
  await apiRequest('/auth/refresh-token', { method: 'POST' })
  const gateway = 'https://akura-api-gateway.vercel.app/api/v1'
  assert.equal(calls[0].url, `${gateway}/finance/invoices`)
  assert.equal(calls[1].url, `${gateway}/auth/refresh-token`)
})

test('Direct-service calls attach the development access token; auth calls rely on cookies only', async () => {
  const { apiRequest, setAccessToken, calls } = await loadApi()
  setAccessToken('local-access-token')
  await apiRequest('/fieldservice/options/inspectors')
  assert.equal(calls[0].headers.get('Authorization'), 'Bearer local-access-token')
  await apiRequest('/auth/refresh-token', { method: 'POST' })
  assert.equal(calls[1].headers.get('Authorization'), null)
})
