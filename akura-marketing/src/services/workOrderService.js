import { apiRequest } from './api'

// Work Orders are served by the Field Service MFE; Marketing only creates one
// from an approved quotation. Inspector names come from the branch Auth directory.
export const workOrderService = {
  sync: (id, { page = 1, limit = 20 } = {}, options = {}) => apiRequest(`/fieldservice/work-orders/${encodeURIComponent(id)}/sync?${new URLSearchParams({ page, limit })}`, options),
  createFromQuotation: (payload) => apiRequest('/fieldservice/work-orders/from-quotation', { method: 'POST', body: JSON.stringify(payload) }),
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
}
