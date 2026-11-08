import assert from 'node:assert/strict'
import { after, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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

const { userService } = await server.ssrLoadModule('/src/services/userService.js')

test('user management renders the user table without the retired sync monitoring tab', async () => {
  const { default: UserPage } = await server.ssrLoadModule('/src/modules/user/UserPage.jsx')
  const html = renderToStaticMarkup(createElement(UserPage))

  assert.match(html, /User Management/)
  for (const column of ['Username', 'Name', 'Role', 'Section', 'Status', 'Branch', 'Actions']) {
    assert.ok(html.includes(column), `Missing user table column: ${column}`)
  }
  assert.doesNotMatch(html, /User Sync|sync-status|role="tab"/)
})

test('user requests use the remaining Auth endpoints and preserve filters and versioned branch updates', async (context) => {
  const calls = []
  const payload = { success: true, data: { users: [] } }
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), options })
    return { ok: true, status: 200, json: async () => payload }
  })
  context.after(() => fetchMock.mock.restore())

  assert.deepEqual(Object.keys(userService).sort(), ['get', 'list', 'update'])
  assert.equal(await userService.list({ page: 2, limit: 20, isActive: false, section: '', search: 'Jane Doe' }), payload)
  assert.equal(calls[0].url.pathname, '/api/v1/auth/users')
  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), {
    page: '2', limit: '20', isActive: 'false', search: 'Jane Doe',
  })

  const userId = '00000000-0000-4000-8000-000000000001'
  await userService.get(userId)
  assert.equal(calls[1].url.pathname, `/api/v1/auth/users/${userId}`)

  const changes = { officeBranchId: null, branch: null, isActive: false, version: 4 }
  await userService.update(userId, changes)
  assert.equal(calls[2].url.pathname, `/api/v1/auth/users/${userId}`)
  assert.equal(calls[2].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[2].options.body), changes)
  assert.ok(calls.every(({ options }) => options.credentials === 'include'))
})
