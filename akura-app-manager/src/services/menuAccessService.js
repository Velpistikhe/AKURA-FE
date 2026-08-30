import { apiRequest } from './api'

const MENU_ACCESS_PATH = '/app-manager/menu-accesses'

export const menuAccessService = {
  list: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        query.set(key, String(value))
      }
    })
    return apiRequest(`${MENU_ACCESS_PATH}?${query.toString()}`)
  },
  get: (menuAccessId) => apiRequest(`${MENU_ACCESS_PATH}/${menuAccessId}`),
  create: (data) => apiRequest(MENU_ACCESS_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (menuAccessId, data) => apiRequest(`${MENU_ACCESS_PATH}/${menuAccessId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (menuAccessId) => apiRequest(`${MENU_ACCESS_PATH}/${menuAccessId}`, {
    method: 'DELETE',
  }),
}

export default menuAccessService
