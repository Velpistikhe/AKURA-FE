import api from './api'

export const menuAPI = {
  myMenus: (config) => api.get('/app-manager/menus/my-menus', config),
}

export default menuAPI
