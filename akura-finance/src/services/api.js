const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
const SHELL_URL = (import.meta.env.VITE_AKURA_SHELL_URL || 'http://localhost:4173').replace(/\/+$/, '')
const REFRESH_PATH = '/auth/refresh-token'

let refreshPromise = null


async function executeRequest(path, options = {}) {
  const { responseType, ...requestOptions } = options
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
