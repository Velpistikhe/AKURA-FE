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
  get: (companyId) => apiRequest(`${COMPANY_PATH}/${companyId}`),
  create: (data) => apiRequest(COMPANY_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (companyId, data) => apiRequest(`${COMPANY_PATH}/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (companyId) => apiRequest(`${COMPANY_PATH}/${companyId}`, {
    method: 'DELETE',
  }),
}

export default companyService
