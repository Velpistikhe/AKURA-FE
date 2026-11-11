import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import axios from 'axios'
import { createServer } from 'vite'

async function loadApi(context, env, adapter) {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false, envDir: false, appType: 'custom',
    define: { 'import.meta.env': JSON.stringify(env) },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
  })
  context.after(() => server.close())
  const previousAdapter = axios.defaults.adapter
  axios.defaults.adapter = adapter
  try {
    return await server.ssrLoadModule('/src/services/api.js')
  } finally {
    axios.defaults.adapter = previousAdapter
  }
}

const gateway = 'https://gateway.example/api/v1'
for (const [name, env, authBase, managerBase, managerPath] of [
  ['hybrid', { PROD: false, VITE_AUTH_BASE_URL: gateway, VITE_APP_MANAGER_BASE_URL: 'http://localhost:5002' }, gateway, 'http://localhost:5002', '/menus/my-menus?officeBranchId=branch-one'],
  ['legacy domain override', { PROD: false, VITE_AUTH_BASE_URL: gateway, VITE_API_BASE_URL: 'http://localhost:5002' }, gateway, 'http://localhost:5002', '/menus/my-menus?officeBranchId=branch-one'],
  ['configured gateway', { PROD: false, VITE_API_BASE_URL: gateway }, gateway, gateway, '/app-manager/menus/my-menus?officeBranchId=branch-one'],
  ['production', { PROD: true }, '/api/v1', '/api/v1', '/app-manager/menus/my-menus?officeBranchId=branch-one'],
  ['development default', { PROD: false }, 'https://akura-api-gateway.vercel.app/api/v1', 'https://akura-api-gateway.vercel.app/api/v1', '/app-manager/menus/my-menus?officeBranchId=branch-one'],
]) {
  test(name + ' keeps auth on its issuing gateway and routes App Manager with a Bearer token', async (context) => {
    const calls = []
    const { default: api, authAPI, getAccessToken } = await loadApi(context, env, async (config) => {
      calls.push({ url: axios.getUri(config), token: config.headers.get('Authorization'), credentials: config.withCredentials })
      return { status: 200, data: { data: { accessToken: 'shell-token' } }, headers: {}, config }
    })
    await authAPI.login({ username: 'user', password: 'password' })
    assert.equal(getAccessToken(), 'shell-token')
    await api.get('/app-manager/menus/my-menus?officeBranchId=branch-one')
    await api.get('/app-manager/internal/events')
    await authAPI.me()
    assert.deepEqual(calls.map(({ url }) => url), [
      authBase + '/auth/login', managerBase + managerPath, authBase + '/app-manager/internal/events', authBase + '/auth/me',
    ])
    assert.equal(calls[0].token, undefined)
    assert.equal(calls[1].token, 'Bearer shell-token')
    assert.equal(calls[3].token, undefined)
    assert.ok(calls.every(({ credentials }) => credentials === true))
  })
}

test('concurrent local App Manager 401s share one gateway refresh and preserve routing and the mutation version', async (context) => {
  const calls = []
  let refreshes = 0
  const { default: api, authAPI, getAccessToken } = await loadApi(context, {
    PROD: false, VITE_AUTH_BASE_URL: gateway, VITE_APP_MANAGER_BASE_URL: 'http://localhost:5002',
  }, async (config) => {
    const url = axios.getUri(config)
    const token = config.headers.get('Authorization')
    calls.push({ url, token, body: config.data })
    let data = { success: true }
    if (url === gateway + '/auth/login') data = { data: { accessToken: 'expired-token' } }
    else if (url === gateway + '/auth/refresh-token') {
      refreshes += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      data = { data: { accessToken: 'rotated-token' } }
    } else if (token !== 'Bearer rotated-token') {
      throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { status: 401, data: {}, headers: {}, config })
    }
    return { status: 200, data, headers: {}, config }
  })
  await authAPI.login({ username: 'user', password: 'password' })
  const path = '/app-manager/office-branches/branch-one'
  await Promise.all([api.patch(path, { version: 7 }), api.patch(path, { version: 8 })])
  assert.equal(refreshes, 1)
  assert.equal(getAccessToken(), 'rotated-token')
  const domainCalls = calls.filter(({ url }) => url.startsWith('http://localhost:5002'))
  assert.equal(domainCalls.length, 4)
  assert.ok(domainCalls.every(({ url }) => url === 'http://localhost:5002/office-branches/branch-one'))
  assert.deepEqual(domainCalls.map(({ body }) => JSON.parse(body).version), [7, 8, 7, 8])
  assert.ok(domainCalls.slice(2).every(({ token }) => token === 'Bearer rotated-token'))
})
