import { apiRequest } from './api'

const COMPANY_PATH = '/marketing/companies'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      query.set(key, String(value))
    }
  })
  return query.toString()
}

export const companyService = {
  list: (params = {}) => apiRequest(`${COMPANY_PATH}?${withQuery(params)}`),
  history: (companyId, { page = 1, limit = 20 } = {}) => apiRequest(`${COMPANY_PATH}/${companyId}/history?${withQuery({ page, limit })}`),
  staffHistory: (companyId, { page = 1, limit = 20 } = {}) => apiRequest(`${COMPANY_PATH}/${companyId}/staff-history?${withQuery({ page, limit })}`),
  get: (companyId) => apiRequest(`${COMPANY_PATH}/${companyId}`),
  create: (data) => apiRequest(COMPANY_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (companyId, data) => apiRequest(`${COMPANY_PATH}/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (companyId, version) => apiRequest(`${COMPANY_PATH}/${companyId}`, {
    method: 'DELETE',
    body: JSON.stringify({ version }),
  }),
}

export default companyService
