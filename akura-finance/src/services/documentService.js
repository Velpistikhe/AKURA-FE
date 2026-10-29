import { apiRequest } from './api'

const query = (params = {}) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString()
export function documentService(kind) {
  const documentKind = { invoices: 'INVOICE', 'proforma-invoices': 'PROFORMA_INVOICE' }[kind]
  if (!documentKind) throw new Error('Unsupported document kind.')
  const path = '/finance/documents'
  const resource = (id) => `${path}/${encodeURIComponent(id)}`
  return {
    list: (params, { signal } = {}) => apiRequest(`${path}?${query({ ...params, kind: documentKind })}`, { signal }),
    get: (id) => apiRequest(resource(id)),
    create: (body) => apiRequest(path, { method: 'POST', body: JSON.stringify({ ...body, kind: documentKind }) }),
    update: (id, body) => apiRequest(resource(id), { method: 'PATCH', body: JSON.stringify(body) }),
    approve: (id, version) => apiRequest(`${resource(id)}/approve`, { method: 'POST', body: JSON.stringify({ version }) }),
    remove: (id, version) => apiRequest(resource(id), { method: 'DELETE', body: JSON.stringify({ version }) }),
    history: (id, params, { signal } = {}) => apiRequest(`${resource(id)}/history?${query(params)}`, { signal }),
  }
}
