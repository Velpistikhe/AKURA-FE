import { apiRequest } from './api'

const PATH = '/marketing/quotations'
export const quotationService = {
  list: ({ page = 1, limit = 20 } = {}) => apiRequest(`${PATH}?${new URLSearchParams({ page, limit })}`),
  get: (id) => apiRequest(`${PATH}/${id}`),
  create: (data) => apiRequest(PATH, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`${PATH}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id, version) => apiRequest(`${PATH}/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
}
