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
  update: (id, payload) => apiRequest(`${PATH}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  history: (id, params = {}) => apiRequest(`${PATH}/${id}/history?${withQuery(params)}`),
}
