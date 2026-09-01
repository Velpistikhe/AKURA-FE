import { apiRequest } from './api'

const serviceMaintenancePath = (serviceId) => `/marketing/services/${serviceId}/maintenance`

export const maintenanceService = {
  create: (serviceId, data) => apiRequest(serviceMaintenancePath(serviceId), {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createScope: (serviceId, data) => apiRequest(`${serviceMaintenancePath(serviceId)}/scopes`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  removeScope: (serviceId, scopeId) => apiRequest(`${serviceMaintenancePath(serviceId)}/scopes/${scopeId}`, {
    method: 'DELETE',
  }),
}

export default maintenanceService
