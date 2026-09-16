import { apiRequest } from './api'

const PATH = '/marketing/company-contracts'
export const contractService = {
  list: (params = {}) => apiRequest(`${PATH}?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))}`),
  get: (contractId) => apiRequest(`${PATH}/${contractId}`),
  approve: (contractId, version) => apiRequest(`${PATH}/${contractId}/approve`, { method: 'POST', body: JSON.stringify({ version }) }),
  create: (data) => apiRequest(PATH, { method: 'POST', body: JSON.stringify(data) }),
  update: (contractId, data) => apiRequest(`${PATH}/${contractId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (contractId, version, terminatedAt) => apiRequest(`${PATH}/${contractId}`, { method: 'DELETE', body: JSON.stringify({ version, terminatedAt }) }),
  listPrices: (params = {}) => apiRequest(`/marketing/company-contract-prices?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null))}`),
  importPrices: (contractId, { companyId, version, file }) => {
    const body = new FormData()
    body.append('file', file)
    body.append('companyId', companyId)
    body.append('version', String(version))
    return apiRequest(`${PATH}/${contractId}/prices/import`, { method: 'POST', body })
  },
}
