import { apiRequest } from './api'

const query = params => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString()

// Read-only, branch-scoped Marketing options. Never submit catalog prices to Finance.
export const documentOptionService = {
  companies: (params = {}) => apiRequest(`/marketing/companies?${query(params)}`),
  items: (params = {}) => apiRequest(`/marketing/items/sizes/prices?${query(params)}`),
}
