// Finance data endpoints go to the directly accessed local service in
// development; production uses the same-origin gateway.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5004')).replace(/\/+$/, '')
// Auth and other-module paths (e.g. Marketing quotation references) always run
// on the gateway that issued the HttpOnly session cookie in development, never
// on the directly accessed Finance service.
const GATEWAY_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL
  || (import.meta.env.PROD ? '/api/v1' : 'https://akura-api-gateway.vercel.app/api/v1')).replace(/\/+$/, '')
const SHELL_URL = (import.meta.env.VITE_AKURA_SHELL_URL || 'http://localhost:4173').replace(/\/+$/, '')
const REFRESH_PATH = '/auth/refresh-token'

let refreshPromise = null

// Development access token handed over by the Shell. Kept in memory only.
let accessToken = ''

export function setAccessToken(token) {
  accessToken = typeof token === 'string' ? token : ''
}

export function getAccessToken() {
  return accessToken
}

async function executeRequest(path, options = {}) {
  const { responseType, ...requestOptions } = options
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const isGatewayPath = path.startsWith('/auth/') || path.startsWith('/marketing/')
  if (!isGatewayPath && accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`)
  const response = await fetch(`${isGatewayPath ? GATEWAY_BASE_URL : API_BASE_URL}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers,
  })

  if (response.ok && responseType === 'blob') {
    return { response, payload: { blob: await response.blob() } }
  }
  const payload = await response.json().catch(() => null)
  return { response, payload }
}

function createApiError(response, payload) {
  const error = new Error(payload?.message || 'The server request failed.')
  error.status = response.status
  error.details = payload?.errors
  return error
}

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = executeRequest(REFRESH_PATH, {
      method: 'POST',
    })
      .then(({ response, payload }) => {
        if (!response.ok) throw createApiError(response, payload)
        // Keep direct-service requests on the rotated token after gateway refresh.
        if (payload?.data?.accessToken) setAccessToken(payload.data.accessToken)
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function redirectToLogin() {
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
  if (!result.response.ok) throw createApiError(result.response, result.payload)
  return result.payload
}
