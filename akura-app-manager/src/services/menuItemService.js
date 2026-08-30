import { apiRequest } from './api'

const MENU_ITEM_PATH = '/app-manager/menu-items'

export const menuItemService = {
  list: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        query.set(key, String(value))
      }
    })
    return apiRequest(`${MENU_ITEM_PATH}?${query.toString()}`)
  },
  get: (menuItemId) => apiRequest(`${MENU_ITEM_PATH}/${menuItemId}`),
  create: (data) => apiRequest(MENU_ITEM_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (menuItemId, data) => apiRequest(`${MENU_ITEM_PATH}/${menuItemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (menuItemId) => apiRequest(`${MENU_ITEM_PATH}/${menuItemId}`, {
    method: 'DELETE',
  }),
}

export default menuItemService
