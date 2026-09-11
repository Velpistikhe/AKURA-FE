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
  listSizes: (params = {}) => apiRequest(`${ITEM_PATH}/sizes?${withQuery(params)}`),
  listPrices: (params = {}) => apiRequest(`${ITEM_PATH}/sizes/prices?${withQuery(params)}`),
  download: (params = {}) => apiRequest(`${ITEM_PATH}/sizes/export?${withQuery(params)}`, { responseType: 'blob' }),
  get: (itemId) => apiRequest(`${ITEM_PATH}/${itemId}`),
  create: (data) => apiRequest(ITEM_PATH, { method: 'POST', body: JSON.stringify(data) }),
  addSize: (data) => apiRequest(`${ITEM_PATH}/sizes`, { method: 'POST', body: JSON.stringify(data) }),
  removeSize: (itemSizeId) => apiRequest(`${ITEM_PATH}/sizes/${itemSizeId}`, { method: 'DELETE' }),
  remove: (itemId) => apiRequest(`${ITEM_PATH}/${itemId}`, { method: 'DELETE' }),
}

export default itemService
