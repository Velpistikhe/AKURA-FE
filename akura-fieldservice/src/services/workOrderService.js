import { apiRequest } from './api'

const PATH = '/fieldservice/work-orders'
function withQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null) query.set(key, String(value))
  })
  return query.toString()
}

export const workOrderService = {
  list: (params = {}) => apiRequest(`${PATH}?${withQuery(params)}`),
  get: (id) => apiRequest(`${PATH}/${id}`),
  create: (payload) => apiRequest(PATH, { method: 'POST', body: JSON.stringify(payload) }),
  quotations: () => apiRequest('/fieldservice/options/quotations'),
  quotationItems: (id) => apiRequest(`/fieldservice/options/quotations/${encodeURIComponent(id)}`),
  inspectors: async (officeBranchId) => {
    if (!officeBranchId) throw new Error('An assigned branch is required to load inspectors.')
    const users = []
    let page = 1
    let totalPages = 1
    do {
      const query = new URLSearchParams({
        page, limit: 100, officeBranchId, isActive: true, section: 'FIELD_SERVICE',
        sortBy: 'firstName', sortOrder: 'asc',
      })
      const { data } = await apiRequest(`/auth/users?${query}`)
      if (!Array.isArray(data?.users) || !Number.isInteger(data?.pagination?.totalPages)) {
        throw new Error('Invalid inspector directory response.')
      }
      users.push(...data.users)
      totalPages = data.pagination.totalPages
      page += 1
    } while (page <= totalPages)
    return users
  },
  revoke: (id, version) => apiRequest(`${PATH}/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
  update: (id, payload) => apiRequest(`${PATH}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  history: (id, params = {}) => apiRequest(`${PATH}/${id}/history?${withQuery(params)}`),
  // DRAFT -> IN_PROGRESS is a version-locked transition that re-validates
  // the Marketing quotation snapshot before committing.
  start: (id, version) => apiRequest(`${PATH}/${id}/start`, { method: 'POST', body: JSON.stringify({ version }) }),
}
