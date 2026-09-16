import { apiRequest } from './api'

const PATH = '/marketing/quotations'
// Finance deliberately exposes only the documented read operations.
export const quotationService = {
  list: ({ page = 1, limit = 20 } = {}, { signal } = {}) => apiRequest(`${PATH}?${new URLSearchParams({ page, limit })}`, { method: 'GET', signal }),
  get: (id, { signal } = {}) => apiRequest(`${PATH}/${encodeURIComponent(id)}`, { method: 'GET', signal }),
}
