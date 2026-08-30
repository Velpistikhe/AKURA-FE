import { apiRequest } from './api'

const MAINTENANCE_PATH = '/marketing/maintenances'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) query.set(key, String(value))
  })
  return query.toString()
}

export const maintenanceService = {
  list: (params = {}) => apiRequest(`${MAINTENANCE_PATH}?${withQuery(params)}`),
  get: (maintenanceId) => apiRequest(`${MAINTENANCE_PATH}/${maintenanceId}`),
  create: (data) => apiRequest(MAINTENANCE_PATH, { method: 'POST', body: JSON.stringify(data) }),
  createScope: (maintenanceId, data) => apiRequest(`${MAINTENANCE_PATH}/${maintenanceId}/scopes`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

export default maintenanceService
