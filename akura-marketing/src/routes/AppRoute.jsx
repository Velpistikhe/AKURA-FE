import CompanyPage from '../modules/company/CompanyPage'
import ItemPage from '../modules/item/ItemPage'
import ServicePage from '../modules/service/ServicePage'
import QuotationPage from '../modules/quotation/QuotationPage'
import QuotationCreatePage from '../modules/quotation/QuotationCreatePage'
import { canManageQuotations } from '../modules/quotation/quotationAccess'

const moduleRoutes = {
  '/referensi/companies': CompanyPage,
  '/referensi/services': ServicePage,
  '/referensi/items': ItemPage,
}

function AppRoute({ currentUser, pathname = window.location.pathname, navigate, fallback = null }) {
  const readOnly = !canManageQuotations(currentUser)
  const path = pathname.replace(/\/+$/, '')
  const isQuotationCreate = /^\/marketing\/(quotations|quotation)\/create$/.test(path)
  if (isQuotationCreate || /^\/marketing\/(quotations|quotation)$/.test(path)) {
    return <div key={`${path}-${readOnly}`} className={`quotation-route quotation-route--${isQuotationCreate && !readOnly ? 'create' : 'browse'}`}>
      {isQuotationCreate
        ? <QuotationCreatePage currentUser={currentUser} onBack={() => navigate(path.slice(0, -7))} />
        : <QuotationPage currentUser={currentUser} onCreate={readOnly ? undefined : () => navigate(`${path}/create`)} />}
    </div>
  }
  const Module = moduleRoutes[path]

  return Module ? <Module currentUser={currentUser} onCreate={() => navigate(`${path}/create`)} /> : fallback
}

export default AppRoute
