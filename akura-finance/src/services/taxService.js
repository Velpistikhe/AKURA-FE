import { apiRequest } from './api'

const PATH = '/finance/taxes'
export const taxService = {
  list: ({ page = 1, limit = 20 } = {}, { signal } = {}) => apiRequest(`${PATH}?${new URLSearchParams({ page, limit })}`, { method: 'GET', signal }),
  deliveries: ({ page = 1, limit = 20 } = {}, { signal } = {}) => apiRequest(`${PATH}/deliveries?${new URLSearchParams({ page, limit })}`, { method: 'GET', signal }),
  create: ({ percentage, effectiveFrom }) => apiRequest(PATH, { method: 'POST', body: JSON.stringify({ percentage, effectiveFrom }) }),
  resync: () => apiRequest(`${PATH}/resync`, { method: 'POST', body: JSON.stringify({}) }),
}
