import axios from 'axios'
import { clearRefreshToken, setRefreshToken } from './tokenStore'

const BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? '/api/v1' : 'https://akura-api-gateway.vercel.app/api/v1')).replace(/\/+$/, '')
const APP_MANAGER_BASE_URL = (import.meta.env.VITE_APP_MANAGER_BASE_URL
  || import.meta.env.VITE_API_BASE_URL || BASE_URL).replace(/\/+$/, '')

// Development access token kept in memory only (never localStorage/sessionStorage).
// Exposed as a getter so microfrontends can send Authorization: Bearer when they
// call a microservice directly instead of through the API Gateway.
let accessToken = ''

export function getAccessToken() {
  return accessToken
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  // Server mengelola session cookie secara otomatis
  withCredentials: true,
})

const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  // Retain the logical path so a 401 retry can recalculate the local URL once.
  const path = config._akuraPath || config.url || ''
  config._akuraPath = path
  const isAppManagerPath = path.startsWith('/app-manager/') && !/^\/app-manager\/internal(?:[/?]|$)/.test(path)
  config.baseURL = isAppManagerPath ? APP_MANAGER_BASE_URL : BASE_URL
  config.url = isAppManagerPath && !/\/api\/v1(?:\/|$)/.test(config.baseURL)
    ? path.slice('/app-manager'.length) : path
  if (isAppManagerPath && accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
  return config
})

const AUTH_PATHS_WITHOUT_REFRESH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/logout',
]

let refreshPromise = null

function getResponseRefreshToken(response) {
  return response?.data?.data?.refreshToken || response?.data?.refreshToken || ''
}

function captureRefreshToken(response) {
  const token = getResponseRefreshToken(response)
  if (token) setRefreshToken(token)
  // Login and refresh return data.accessToken; GET /auth/me echoes it at the
  // top level so a page reload can restore the Bearer token.
  const issued = response?.data?.data?.accessToken || response?.data?.accessToken
  if (issued) accessToken = issued
  return response
}

function isRefreshAllowed(config) {
  const url = config?.url || ''
  return !AUTH_PATHS_WITHOUT_REFRESH.some((path) => url.includes(path))
}

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshApi
      .post('/auth/refresh-token')
      .then(captureRefreshToken)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function redirectToLogin() {
  clearRefreshToken()
  accessToken = ''
  const publicPaths = ['/', '/login', '/register']
  const isPublicPath = publicPaths.includes(window.location.pathname)

  if (!isPublicPath) {
    window.location.assign('/login')
  }
}

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  captureRefreshToken,
  async (error) => {
    // Session expired / unauthorized → redirect ke login
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      isRefreshAllowed(originalRequest)
    ) {
      originalRequest._retry = true

      try {
        await refreshSession()
        return api(originalRequest)
      } catch (refreshError) {
        if ([400, 401].includes(refreshError.response?.status)) {
          redirectToLogin()
        }
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401 && originalRequest?._retry) {
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  /**
   * Login — POST /auth/login
   * Body: { username, password }
   * Response: { status, success, message, data: { user } }
   */
  login: (data) =>
    api.post('/auth/login', {
      username: data.username,
      password: data.password,
    }),

  /**
   * Logout — POST /auth/logout
   * Refresh token is read from the HttpOnly cookie.
   */
  logout: () => api.post('/auth/logout').finally(() => {
    clearRefreshToken()
    accessToken = ''
  }),

  refreshToken: () => refreshSession(),

  /**
   * Me — GET /auth/me
   * Response: { status, success, message, data: { ...user } }
   * Digunakan untuk verifikasi sesi aktif & ambil profil terkini
   */
  me: () => api.get('/auth/me'),

  updateProfile: ({ firstName, lastName, email, telp }) =>
    api.put('/auth/profile', { firstName, lastName, email, telp }),

  changePassword: ({ oldPassword, newPassword, newPasswordConfirmation }) =>
    api.put('/auth/password', {
      oldPassword,
      newPassword,
      newPasswordConfirmation,
    }),

  /**
   * Register — POST /auth/register
   * Body: { username, password, passwordConfirmation, firstName, lastName, email?, telp? }
   * Response: { status: 201, success, message } (without a session)
   */
  register: ({ username, password, passwordConfirmation, firstName, lastName, email, telp }) =>
    api.post('/auth/register', {
      username,
      password,
      passwordConfirmation,
      firstName,
      lastName,
      email,
      telp,
    }),
}

export default api
