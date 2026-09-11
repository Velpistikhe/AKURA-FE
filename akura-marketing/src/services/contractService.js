import { apiRequest } from './api'

const PATH = '/marketing/company-contracts'
export const contractService = {
  list: ({ companyId, page = 1, limit = 100 }) => apiRequest(`${PATH}?${new URLSearchParams({ companyId, page, limit })}`),
  importPrices: (contractId, { companyId, version, file }) => {
    const body = new FormData()
    body.append('file', file)
    body.append('companyId', companyId)
    body.append('version', String(version))
    return apiRequest(`${PATH}/${contractId}/prices/import`, { method: 'POST', body })
  },
}
