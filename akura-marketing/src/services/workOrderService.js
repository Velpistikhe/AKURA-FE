import { apiRequest } from './api'

const PATH = '/fieldservice/work-orders'
export const workOrderService = {
  list: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value != null) query.set(key, String(value))
    })
    return apiRequest(`${PATH}?${query}`)
  },
  get: (id) => apiRequest(`${PATH}/${id}`),
  create: (payload) => apiRequest(PATH, { method: 'POST', body: JSON.stringify(payload) }),
}
