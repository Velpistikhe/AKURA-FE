import { apiRequest } from './api'

const MENU_PATH = '/app-manager/menus'

export const menuService = {
  list: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        query.set(key, String(value))
      }
    })
    return apiRequest(`${MENU_PATH}?${query.toString()}`)
  },
  get: (menuId) => apiRequest(`${MENU_PATH}/${menuId}`),
  create: (data) => apiRequest(MENU_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (menuId, data) => apiRequest(`${MENU_PATH}/${menuId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (menuId) => apiRequest(`${MENU_PATH}/${menuId}`, {
    method: 'DELETE',
  }),
}

export default menuService
