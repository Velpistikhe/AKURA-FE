import { setAccessToken } from '../services/api'
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

function AppRoute({ currentUser, accessToken = '', pathname = window.location.pathname, navigate, fallback = null }) {
  // Development direct access: the Shell passes the Vercel-issued access token so
  // this MFE can send Authorization: Bearer straight to the local Marketing service.
  // Set synchronously (child effects fetch on mount before parent effects run).
  setAccessToken(accessToken)
  const readOnly = !canManageQuotations(currentUser)
  const path = pathname.replace(/\/+$/, '')
  const isQuotationCreate = /^\/marketing\/(quotations|quotation)\/create$/.test(path)
  if (isQuotationCreate || /^\/marketing\/(quotations|quotation)$/.test(path)) {
    return <div key={`${path}-${readOnly}`} className={`quotation-route quotation-route--${isQuotationCreate && !readOnly ? 'create' : 'browse'}`}>
      {isQuotationCreate
        ? <QuotationCreatePage currentUser={currentUser} copyFrom={new URLSearchParams(window.location.search).get('copyFrom')} onBack={() => navigate(path.slice(0, -7))} />
        : <QuotationPage currentUser={currentUser} onCreate={readOnly ? undefined : () => navigate(`${path}/create`)} onCopy={readOnly ? undefined : (id) => navigate(`${path}/create?copyFrom=${encodeURIComponent(id)}`)} />}
    </div>
  }
  const Module = moduleRoutes[path]

  return Module ? <Module currentUser={currentUser} onCreate={() => navigate(`${path}/create`)} /> : fallback
}

export default AppRoute
