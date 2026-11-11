const GATEWAY_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? '/api/v1' : 'https://akura-api-gateway.vercel.app/api/v1')).replace(/\/+$/, '')
// Opt into the local App Manager with VITE_APP_MANAGER_BASE_URL=http://localhost:5002.
const APP_MANAGER_BASE_URL = (import.meta.env.VITE_APP_MANAGER_BASE_URL
  || import.meta.env.VITE_API_BASE_URL || GATEWAY_BASE_URL).replace(/\/+$/, '')
const SHELL_URL = (import.meta.env.VITE_AKURA_SHELL_URL || 'http://localhost:4173').replace(/\/+$/, '')
const REFRESH_PATH = '/auth/refresh-token'

let refreshPromise = null
let accessToken = ''

export function setAccessToken(token) {
  accessToken = typeof token === 'string' ? token : ''
}

export function getAccessToken() {
  return accessToken
}

async function executeRequest(path, options = {}) {
  const isAppManagerPath = path.startsWith('/app-manager/') && !/^\/app-manager\/internal(?:[/?]|$)/.test(path)
  const baseUrl = isAppManagerPath ? APP_MANAGER_BASE_URL : GATEWAY_BASE_URL
  const requestPath = isAppManagerPath && !/\/api\/v1(?:\/|$)/.test(baseUrl)
    ? path.slice('/app-manager'.length) : path
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!path.startsWith('/auth/') && accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`)
  const response = await fetch(`${baseUrl}${requestPath}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  const payload = await response.json().catch(() => null)

  return { response, payload }
}

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = executeRequest(REFRESH_PATH, {
      method: 'POST',
    })
      .then(({ response, payload }) => {
        if (!response.ok) {
          const error = createApiError(response, payload)
          throw error
        }
        if (payload?.data?.accessToken) setAccessToken(payload.data.accessToken)
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function createApiError(response, payload) {
  const error = new Error(payload?.message || 'The server request failed.')
  error.status = response.status
  error.details = payload?.errors
  return error
}

function redirectToLogin() {
  setAccessToken('')
  window.location.assign(`${SHELL_URL}/login`)
}

export async function apiRequest(path, options = {}) {
  let result = await executeRequest(path, options)

  if (result.response.status === 401 && path !== REFRESH_PATH) {
    try {
      await refreshSession()
      result = await executeRequest(path, options)
    } catch (refreshError) {
      if ([400, 401].includes(refreshError.status)) redirectToLogin()
      throw refreshError
    }
  }

  if (result.response.status === 401) redirectToLogin()

  if (!result.response.ok) {
    throw createApiError(result.response, result.payload)
  }

  return result.payload
}
