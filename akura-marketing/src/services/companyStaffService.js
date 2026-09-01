import { apiRequest } from './api'

const STAFF_PATH = '/marketing/company-staffs'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      query.set(key, String(value))
    }
  })
  return query.toString()
}

export const companyStaffService = {
  list: (params = {}) => apiRequest(`${STAFF_PATH}?${withQuery(params)}`),
  get: (companyStaffId) => apiRequest(`${STAFF_PATH}/${companyStaffId}`),
  create: (data) => apiRequest(STAFF_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (companyStaffId, data) => apiRequest(`${STAFF_PATH}/${companyStaffId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (companyStaffId) => apiRequest(`${STAFF_PATH}/${companyStaffId}`, {
    method: 'DELETE',
  }),
}

export default companyStaffService
