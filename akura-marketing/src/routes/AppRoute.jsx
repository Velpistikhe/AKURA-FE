import CompanyPage from '../modules/company/CompanyPage'
import ItemPage from '../modules/item/ItemPage'
import ServicePage from '../modules/service/ServicePage'

const moduleRoutes = {
  companies: CompanyPage,
  services: ServicePage,
  items: ItemPage,
}

function AppRoute({ pathname = window.location.pathname, fallback = null }) {
  const moduleKey = pathname.replace(/\/+$/, '').split('/').filter(Boolean).at(-1) || ''
  const Module = moduleRoutes[moduleKey]

  return Module ? <Module /> : fallback
}

export default AppRoute
