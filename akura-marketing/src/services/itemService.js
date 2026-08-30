import { apiRequest } from './api'

const ITEM_PATH = '/marketing/items'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) query.set(key, String(value))
  })
  return query.toString()
}

export const itemService = {
  list: (params = {}) => apiRequest(`${ITEM_PATH}?${withQuery(params)}`),
  get: (itemId) => apiRequest(`${ITEM_PATH}/${itemId}`),
  create: (data) => apiRequest(ITEM_PATH, { method: 'POST', body: JSON.stringify(data) }),
  update: (itemId, data) => apiRequest(`${ITEM_PATH}/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (itemId) => apiRequest(`${ITEM_PATH}/${itemId}`, { method: 'DELETE' }),
}

export default itemService
