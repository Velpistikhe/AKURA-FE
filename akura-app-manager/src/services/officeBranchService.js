import { apiRequest } from './api'

const OFFICE_BRANCH_PATH = '/app-manager/office-branches'

function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      query.set(key, String(value))
    }
  })
  return query.toString()
}

export const officeBranchService = {
  list: (params = {}) => apiRequest(`${OFFICE_BRANCH_PATH}?${withQuery(params)}`),
  options: () => apiRequest(`${OFFICE_BRANCH_PATH}/options`),
  get: (officeBranchId) => apiRequest(`${OFFICE_BRANCH_PATH}/${officeBranchId}`),
  create: (data) => apiRequest(OFFICE_BRANCH_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (officeBranchId, data) => apiRequest(`${OFFICE_BRANCH_PATH}/${officeBranchId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (officeBranchId) => apiRequest(`${OFFICE_BRANCH_PATH}/${officeBranchId}`, {
    method: 'DELETE',
  }),
}

export default officeBranchService
