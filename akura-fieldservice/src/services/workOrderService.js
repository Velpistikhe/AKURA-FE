import { apiRequest } from './api'

const PATH = '/fieldservice/work-orders'
function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null) query.set(key, String(value))
  })
  return query.toString()
}

export const workOrderService = {
  list: (params = {}) => apiRequest(`${PATH}?${withQuery(params)}`),
  get: (id) => apiRequest(`${PATH}/${id}`),
  create: (payload) => apiRequest(PATH, { method: 'POST', body: JSON.stringify(payload) }),
  quotations: () => apiRequest('/fieldservice/options/quotations'),
  quotationItems: (id) => apiRequest(`/fieldservice/options/quotations/${encodeURIComponent(id)}`),
  inspectors: () => apiRequest('/fieldservice/options/inspectors'),
  revoke: (id, version) => apiRequest(`${PATH}/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
  update: (id, payload) => apiRequest(`${PATH}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  history: (id, params = {}) => apiRequest(`${PATH}/${id}/history?${withQuery(params)}`),
  // DRAFT -> IN_PROGRESS is a version-locked transition the backend re-validates
  // against Auth (inspectors) and Marketing (quotation snapshot) before committing.
  start: (id, version) => apiRequest(`${PATH}/${id}/start`, { method: 'POST', body: JSON.stringify({ version }) }),
}
