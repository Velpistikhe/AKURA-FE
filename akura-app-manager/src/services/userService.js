import { apiRequest } from './api'

const USER_PATH = '/auth/users'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      query.set(key, String(value))
    }
  })
  return query.toString()
}

export const userService = {
  list: (params = {}) => apiRequest(`${USER_PATH}?${withQuery(params)}`),
  get: (userId) => apiRequest(`${USER_PATH}/${userId}`),
  setRole: (userId, data) => apiRequest(`${USER_PATH}/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  setSection: (userId, data) => apiRequest(`${USER_PATH}/${userId}/section`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  setStatus: (userId, data) => apiRequest(`${USER_PATH}/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
}

export default userService
