import { apiRequest } from './api'

const PATH = '/marketing/quotations'
export const quotationService = {
  list: ({ page = 1, limit = 20, isActive, dateFrom, dateTo, no, status, company, invoiceStatus } = {}) => apiRequest(`${PATH}?${new URLSearchParams(
    Object.entries({ page, limit, isActive, dateFrom, dateTo, no, status, company: company?.trim(), invoiceStatus: invoiceStatus === null ? 'null' : invoiceStatus })
      .filter(([, value]) => value !== '' && value != null),
  )}`),
  get: (id) => apiRequest(`${PATH}/${id}`),
  history: (id, { page = 1, limit = 20, action, sortBy = 'version', sortOrder = 'desc' } = {}) => apiRequest(`${PATH}/${encodeURIComponent(id)}/history?${new URLSearchParams({
    page, limit, sortBy, sortOrder, ...(action ? { action } : {}),
  })}`),
  previewPdf: (id, { signal } = {}) => apiRequest(`${PATH}/${encodeURIComponent(id)}/pdf`, {
    method: 'GET', responseType: 'blob', signal, cache: 'no-store', headers: { Accept: 'application/pdf' },
  }),
  approve: (id, version) => apiRequest(`${PATH}/${id}/approve`, { method: 'POST', body: JSON.stringify({ version }) }),
  submit: (id, version) => apiRequest(`${PATH}/${id}/submit`, { method: 'POST', body: JSON.stringify({ version }) }),
  reject: (id, version) => apiRequest(`${PATH}/${id}/reject`, { method: 'POST', body: JSON.stringify({ version }) }),
  revise: (id, version) => apiRequest(`${PATH}/${id}/revise`, { method: 'POST', body: JSON.stringify({ version }) }),
  create: (data) => apiRequest(PATH, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`${PATH}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addItem: (id, data) => apiRequest(`${PATH}/${id}/items`, { method: 'POST', body: JSON.stringify(data) }),
  removeItem: (id, itemId, quotationVersion, itemVersion) => apiRequest(`${PATH}/${id}/items/${itemId}`, {
    method: 'DELETE', body: JSON.stringify({ quotationVersion, itemVersion }),
  }),
  remove: (id, version) => apiRequest(`${PATH}/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
}
