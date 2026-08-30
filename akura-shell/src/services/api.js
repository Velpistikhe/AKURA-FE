import axios from 'axios'
import { clearRefreshToken, getRefreshToken, setRefreshToken } from './tokenStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

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
  return response
}

function isRefreshAllowed(config) {
  const url = config?.url || ''
  return !AUTH_PATHS_WITHOUT_REFRESH.some((path) => url.includes(path))
}

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshApi
      .post('/auth/refresh-token', { refreshToken: getRefreshToken() })
      .then(captureRefreshToken)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function redirectToLogin() {
  clearRefreshToken()
  if (!window.location.pathname.startsWith('/login')) {
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
   * Body: { refreshToken } (kirim string kosong jika tidak ada)
   */
  logout: (refreshToken = getRefreshToken()) =>
    api.post('/auth/logout', { refreshToken }).finally(clearRefreshToken),

  refreshToken: () => refreshSession(),

  /**
   * Me — GET /auth/me
   * Response: { status, success, message, data: { ...user } }
   * Digunakan untuk verifikasi sesi aktif & ambil profil terkini
   */
  me: () => api.get('/auth/me'),

  updateProfile: ({ firstName, lastName }) =>
    api.put('/auth/profile', { firstName, lastName }),

  changePassword: ({ oldPassword, newPassword, newPasswordConfirmation }) =>
    api.put('/auth/password', {
      oldPassword,
      newPassword,
      newPasswordConfirmation,
    }),

  /**
   * Register — POST /auth/register
   * Body: { username, password, passwordConfirmation, firstName, lastName }
   * Response: { status: 201, success, message, data: { user } }
   */
  register: ({ username, password, passwordConfirmation, firstName, lastName }) =>
    api.post('/auth/register', {
      username,
      password,
      passwordConfirmation,
      firstName,
      lastName,
    }),
}

export default api
