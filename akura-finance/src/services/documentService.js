import { apiRequest } from './api'

const query = (params = {}) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString()
export function documentService(kind) {
  const path = `/finance/${kind}`
  const resource = (id) => `${path}/${encodeURIComponent(id)}`
  return {
    list: (params, { signal } = {}) => apiRequest(`${path}?${query(params)}`, { signal }),
    get: (id) => apiRequest(resource(id)),
    create: (body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => apiRequest(resource(id), { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id, version) => apiRequest(resource(id), { method: 'DELETE', body: JSON.stringify({ version }) }),
    history: (id, params, { signal } = {}) => apiRequest(`${resource(id)}/history?${query(params)}`, { signal }),
  }
}
export const getQuotationReference = (id) => apiRequest(`/marketing/quotation-references/${encodeURIComponent(id)}`)
