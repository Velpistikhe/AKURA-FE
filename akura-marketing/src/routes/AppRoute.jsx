import CompanyPage from '../modules/company/CompanyPage'
import ItemPage from '../modules/item/ItemPage'
import ServicePage from '../modules/service/ServicePage'
import QuotationPage from '../modules/quotation/QuotationPage'
import QuotationCreatePage from '../modules/quotation/QuotationCreatePage'

const moduleRoutes = {
  companies: CompanyPage,
  services: ServicePage,
  items: ItemPage,
  quotations: QuotationPage,
  quotation: QuotationPage,
}

function AppRoute({ pathname = window.location.pathname, navigate, fallback = null }) {
  const path = pathname.replace(/\/+$/, '')
  if (/\/(quotations|quotation)\/create$/.test(path)) {
    return <QuotationCreatePage onBack={() => navigate(path.slice(0, -7))} />
  }
  const moduleKey = pathname.replace(/\/+$/, '').split('/').filter(Boolean).at(-1) || ''
  const Module = moduleRoutes[moduleKey]

  return Module ? <Module onCreate={() => navigate(`${path}/create`)} /> : fallback
}

export default AppRoute
