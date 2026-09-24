import { apiRequest } from './api'

const PATH = '/marketing/company-contracts'
export const contractService = {
  list: (params = {}) => apiRequest(`${PATH}?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))}`),
  get: (contractId) => apiRequest(`${PATH}/${contractId}`),
  priceHistory: (contractPriceId, { page = 1, limit = 20 } = {}) => apiRequest(`/marketing/company-contract-prices/${contractPriceId}/history?${new URLSearchParams({ page, limit })}`),
  history: (contractId, { page = 1, limit = 20 } = {}) => apiRequest(`${PATH}/${contractId}/history?${new URLSearchParams({ page, limit })}`),
  approve: (contractId, version) => apiRequest(`${PATH}/${contractId}/approve`, { method: 'POST', body: JSON.stringify({ version }) }),
  submit: (contractId, version) => apiRequest(`${PATH}/${contractId}/submit`, { method: 'POST', body: JSON.stringify({ version }) }),
  reject: (contractId, version) => apiRequest(`${PATH}/${contractId}/reject`, { method: 'POST', body: JSON.stringify({ version }) }),
  cancel: (contractId, version) => apiRequest(`${PATH}/${contractId}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
  create: (data) => apiRequest(PATH, { method: 'POST', body: JSON.stringify(data) }),
  revise: (contractId, data) => apiRequest(`${PATH}/${contractId}/revise`, { method: 'POST', body: JSON.stringify(data) }),
  update: (contractId, data) => apiRequest(`${PATH}/${contractId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  terminate: (contractId, version, terminatedAt) => apiRequest(`${PATH}/${contractId}/terminate`, { method: 'POST', body: JSON.stringify({ version, terminatedAt }) }),
  listPrices: (params = {}) => apiRequest(`/marketing/company-contract-prices?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))}`),
  createPrice: (itemSizeId, data) => apiRequest(`/marketing/items/sizes/${itemSizeId}/contract-prices`, { method: 'POST', body: JSON.stringify(data) }),
  updatePrice: (contractPriceId, data) => apiRequest(`/marketing/items/contract-prices/${contractPriceId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removePrice: (contractPriceId, version) => apiRequest(`/marketing/items/contract-prices/${contractPriceId}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
  importPrices: (contractId, { companyId, version, file }) => {
    const body = new FormData()
    body.append('file', file)
    body.append('companyId', companyId)
    body.append('version', String(version))
    return apiRequest(`${PATH}/${contractId}/prices/import`, { method: 'POST', body })
  },
}
