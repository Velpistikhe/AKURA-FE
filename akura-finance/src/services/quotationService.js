import { apiRequest } from './api'

const PATH = '/marketing/quotation-references'
// Finance deliberately exposes only the documented read operations.
export const quotationService = {
  list: (_params = {}, { signal } = {}) => apiRequest(PATH, { method: 'GET', signal }),
  get: (id, { signal } = {}) => apiRequest(`${PATH}/${encodeURIComponent(id)}`, { method: 'GET', signal }),
}
