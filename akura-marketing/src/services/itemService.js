import { apiRequest } from './api'

const ITEM_PATH = '/marketing/items'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null && (!Array.isArray(value) || value.length)) query.set(key, String(value))
  })
  return query.toString()
}

export const itemService = {
  list: (params = {}) => apiRequest(`${ITEM_PATH}?${withQuery(params)}`),
  listSizes: (params = {}) => apiRequest(`${ITEM_PATH}/sizes?${withQuery(params)}`),
  listContractPriceOptions: (contractId, params = {}) => apiRequest(`${ITEM_PATH}/sizes/contract-price-options/${contractId}?${withQuery(params)}`),
  listPrices: (params = {}) => apiRequest(`${ITEM_PATH}/sizes/prices?${withQuery(params)}`),
  download: (params = {}) => apiRequest(`${ITEM_PATH}/sizes/export?${withQuery(params)}`, { responseType: 'blob' }),
  get: (itemId) => apiRequest(`${ITEM_PATH}/${itemId}`),
  update: (itemId, data) => apiRequest(`${ITEM_PATH}/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getSize: (id) => apiRequest(`${ITEM_PATH}/sizes/${id}`),
  getPrice: (id) => apiRequest(`${ITEM_PATH}/sizes/${id}/price`),
  createPrice: (id, data) => apiRequest(`${ITEM_PATH}/sizes/${id}/price`, { method: 'POST', body: JSON.stringify(data) }),
  updatePrice: (id, data) => apiRequest(`${ITEM_PATH}/sizes/${id}/price`, { method: 'PATCH', body: JSON.stringify(data) }),
  removePrice: (id, version) => apiRequest(`${ITEM_PATH}/sizes/${id}/price`, { method: 'DELETE', body: JSON.stringify({ version }) }),
  history: (id, { page = 1, limit = 20 } = {}) => apiRequest(`${ITEM_PATH}/${id}/history?${withQuery({ page, limit })}`),
  sizeHistory: (id, { page = 1, limit = 20 } = {}) => apiRequest(`${ITEM_PATH}/sizes/${id}/history?${withQuery({ page, limit })}`),
  priceHistory: (id, { page = 1, limit = 20 } = {}) => apiRequest(`${ITEM_PATH}/sizes/${id}/price/history?${withQuery({ page, limit })}`),
  create: (data) => apiRequest(ITEM_PATH, { method: 'POST', body: JSON.stringify(data) }),
  addSize: (data) => apiRequest(`${ITEM_PATH}/sizes`, { method: 'POST', body: JSON.stringify(data) }),
  removeSize: (itemSizeId, version) => apiRequest(`${ITEM_PATH}/sizes/${itemSizeId}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
  remove: (itemId, version) => apiRequest(`${ITEM_PATH}/${itemId}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
}

export default itemService
