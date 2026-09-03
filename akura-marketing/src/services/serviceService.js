import { apiRequest } from './api'

const SERVICE_PATH = '/marketing/services'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) query.set(key, String(value))
  })
  return query.toString()
}

export const serviceService = {
  list: (params = {}) => apiRequest(`${SERVICE_PATH}?${withQuery(params)}`),
  get: (serviceId) => apiRequest(`${SERVICE_PATH}/${serviceId}`),
  create: (data) => apiRequest(SERVICE_PATH, { method: 'POST', body: JSON.stringify(data) }),
  update: (serviceId, data) => apiRequest(`${SERVICE_PATH}/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (serviceId) => apiRequest(`${SERVICE_PATH}/${serviceId}`, { method: 'DELETE' }),
  createScope: (serviceId, data) => apiRequest(`${SERVICE_PATH}/${serviceId}/scopes`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  removeScope: (serviceId, scopeId) => apiRequest(`${SERVICE_PATH}/${serviceId}/scopes/${scopeId}`, {
    method: 'DELETE',
  }),
  createMaintenanceScope: (serviceId, data) => apiRequest(`${SERVICE_PATH}/${serviceId}/maintenance/scopes`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  removeMaintenanceScope: (serviceId, scopeId) => apiRequest(`${SERVICE_PATH}/${serviceId}/maintenance/scopes/${scopeId}`, {
    method: 'DELETE',
  }),
}

export default serviceService
