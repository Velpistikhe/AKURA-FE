import MenuModule from '../modules/menu/MenuModule'
import UserPage from '../modules/user/UserPage'

const moduleRoutes = {
  menus: MenuModule,
  users: UserPage,
}

function AppRoute({ pathname = window.location.pathname }) {
  const moduleKey = pathname.replace(/\/+$/, '').split('/').filter(Boolean).at(-1) || ''
  const Module = moduleRoutes[moduleKey] || MenuModule

  return <Module />
}

export default AppRoute
